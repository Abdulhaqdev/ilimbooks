import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Landing, Prisma, Rotation, RotationVariant } from '@prisma/client';
import { Account, normAccount } from '../common/account';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  normSlug,
  pathToSlug,
  sanitizeContent,
  slugToPath,
  type Template,
} from '../landings/landing-content';
import type { TimeWindow } from '../analytics/analytics.service';

/** Landing app / nginx bilan to'qnashadigan yo'llar (landinglar bilan bir xil). */
const RESERVED = new Set(['api', 'assets', 'product', 'uploads', 'admin', 'favicon-svg', 't']);

export type RotationMode = 'visit' | 'sticky';

export type RotationInput = {
  name?: string;
  slug?: string;
  active?: boolean;
  mode?: RotationMode;
  autoWinner?: boolean;
  autoMinViews?: number;
  landingIds?: string[];
  /** Bitta landingni bir nechta shablonda nusxalab, hammasini rotatsiyaga qo'shish */
  baseLandingId?: string;
  templates?: string[];
};

const TEMPLATE_LABEL: Record<Template, string> = {
  full: 'Klassik',
  compact: 'Kompakt',
  story: 'Story',
  flash: 'Mega aksiya',
  problem: 'Muammo → Yechim',
  reviews: 'Sharhlar',
  premium: 'Premium',
  kids: 'Bolalar',
  bundle: 'To‘plam',
  minimal: 'Minimal',
};

const normMode = (v: unknown): RotationMode => (v === 'sticky' ? 'sticky' : 'visit');

type FullRotation = Rotation & { variants: (RotationVariant & { landing: Landing })[] };

/** Tashrifchiga berilgan variant shu cookie'da saqlanadi — qayta kirganda o'zgarmaydi. */
export function variantCookieName(rotationId: string) {
  return `ib_r_${rotationId}`;
}

/**
 * Ko'rsatilgan variant: avval brauzer yuborgani (sahifaning o'zi biladi), keyin cookie.
 * Cookie har ochilishda qayta yoziladi — kech kelgan hodisa uchun u boshqa variantni ko'rsatishi mumkin.
 */
export function pickVariant(
  rot: { id: string; variants: { landingId: string }[] },
  sent: unknown,
  cookies: Record<string, string> = {},
): string | null {
  const has = (id: unknown) => typeof id === 'string' && rot.variants.some((v) => v.landingId === id);
  if (has(sent)) return sent as string;
  const assigned = cookies[variantCookieName(rot.id)];
  return has(assigned) ? assigned : null;
}

const clampWeight = (v: unknown) => Math.min(100, Math.max(1, Math.round(Number(v)) || 1));

/**
 * Og'irliklar bo'yicha aralash navbat (smooth weighted round-robin):
 * 3:1 → A,A,B,A emas, A,B,A,A kabi bir tekis taqsimlanadi.
 */
function weightedSequence(weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  const cur = weights.map(() => 0);
  const seq: number[] = [];
  for (let n = 0; n < total; n++) {
    let best = 0;
    for (let i = 0; i < weights.length; i++) {
      cur[i] += weights[i];
      if (cur[i] > cur[best]) best = i;
    }
    cur[best] -= total;
    seq.push(best);
  }
  return seq;
}

/** Ikki konversiya farqining z-qiymati (bir tomonlama): a ning b dan yaxshiligi. */
function zScore(aLeads: number, aViews: number, bLeads: number, bViews: number) {
  const p = (aLeads + bLeads) / (aViews + bViews);
  const se = Math.sqrt(p * (1 - p) * (1 / aViews + 1 / bViews));
  return se > 0 ? (aLeads / aViews - bLeads / bViews) / se : 0;
}

/** ~95% ishonch */
const Z_CONFIDENT = 1.96;
/** Yetakchida kamida shuncha lid bo'lmasa, xulosa chiqarilmaydi */
const MIN_LEADS_FOR_DECISION = 5;
const AUTO_CHECK_MS = 10 * 60_000;

@Injectable()
export class RotationsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Rotations');
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.autoCheckAll(), AUTO_CHECK_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /* ------------------------------------------------------- avtomatik g'olib */

  private async autoCheckAll() {
    try {
      const rows = await this.prisma.rotation.findMany({
        where: { autoWinner: true, active: true },
        select: { id: true },
      });
      for (const r of rows) await this.autoCheck(r.id);
    } catch (e) {
      this.log.error(`avtomatik g'olib tekshiruvi: ${String(e)}`);
    }
  }

  /** Har variantning `since` dan keyingi ko'rish va lidlari. */
  private async variantCounts(rot: FullRotation) {
    const path = slugToPath(rot.slug);
    return Promise.all(
      rot.variants.map(async (v) => {
        const [views, leads] = await Promise.all([
          this.prisma.session.count({
            where: { page: path, account: rot.account, variant: v.landingId, firstSeen: { gte: v.since } },
          }),
          this.prisma.lead.count({
            where: { page: path, account: rot.account, variant: v.landingId, createdAt: { gte: v.since } },
          }),
        ]);
        return { id: v.id, views, leads };
      }),
    );
  }

  /**
   * Yetarli ko'rish yig'ilgan variantlar orasida yetakchidan statistik ishonchli darajada
   * past konversiyalilarni o'chiradi. Yetakchi har doim qoladi.
   */
  async autoCheck(id: string) {
    const rot = await this.full({ id });
    if (!rot || !rot.autoWinner || !rot.active) return [];
    const live = rot.variants.filter((v) => v.active && v.landing.active);
    if (live.length < 2) return [];

    const counts = new Map((await this.variantCounts(rot)).map((c) => [c.id, c]));
    const ready = live
      .map((v) => ({ v, ...counts.get(v.id)! }))
      .filter((x) => x.views >= rot.autoMinViews);
    if (ready.length < 2) return [];

    const best = ready.reduce((a, b) => (b.leads / b.views > a.leads / a.views ? b : a));
    if (best.leads < MIN_LEADS_FOR_DECISION) return [];
    const pct = (l: number, n: number) => `${Math.round((l / n) * 1000) / 10}%`;

    const losers = ready.filter(
      (x) => x !== best && zScore(best.leads, best.views, x.leads, x.views) >= Z_CONFIDENT,
    );
    for (const x of losers) {
      await this.prisma.rotationVariant.update({
        where: { id: x.id },
        data: {
          active: false,
          autoOffAt: new Date(),
          autoOffNote:
            `Konversiya ${pct(x.leads, x.views)} (${x.views} ko‘rish, ${x.leads} lid) — ` +
            `yetakchi “${best.v.landing.name}” ${pct(best.leads, best.views)}`,
        },
      });
      this.log.log(`/${rot.slug}: "${x.v.landing.name}" avtomatik o'chirildi`);
    }
    return losers.map((x) => x.v.landingId);
  }

  private full(where: { id?: string; slug?: string }) {
    return this.prisma.rotation.findUnique({
      where: where as { id: string },
      include: {
        variants: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { landing: true },
        },
      },
    });
  }

  /* ------------------------------------------------------------- public */

  /**
   * Tashrifchiga ko'rsatiladigan variantni tanlaydi.
   * - "sticky": cookie'dagi oldingi variant hali faol bo'lsa — o'sha qaytadi;
   * - "visit" (va yangi tashrifchi): navbatdagi variant (round-robin). Oldin ko'rgan
   *   varianti navbatga tushsa, keyingisiga o'tiladi — qayta ochganda shablon almashadi.
   */
  async resolvePublic(path: string, cookies: Record<string, string> = {}) {
    const slug = pathToSlug(path);
    if (!slug) return null;
    const rot = await this.full({ slug });
    if (!rot || !rot.active) return null;

    const live = rot.variants.filter((v) => v.active && v.landing.active);
    if (!live.length) return null;

    const assigned = cookies[variantCookieName(rot.id)];
    let variant =
      rot.mode === 'sticky' && assigned ? live.find((v) => v.landingId === assigned) : undefined;
    const isNew = !variant;
    if (!variant) {
      // atomik oshirish — bir vaqtda kelgan tashrifchilar bir xil variantga tushmasligi uchun
      const { cursor } = await this.prisma.rotation.update({
        where: { id: rot.id },
        data: { cursor: { increment: 1 } },
        select: { cursor: true },
      });
      const seq = weightedSequence(live.map((v) => clampWeight(v.weight)));
      let pos = (cursor - 1) % seq.length;
      // "visit": oldin ko'rgani navbatga tushsa — keyingi boshqa variantga o'tamiz
      for (let n = 0; n < seq.length && live.length > 1 && live[seq[pos]].landingId === assigned; n++) {
        pos = (pos + 1) % seq.length;
      }
      variant = live[seq[pos]];
    }

    const l = variant.landing;
    const content = sanitizeContent(l.content);
    return {
      rotationId: rot.id,
      landingId: l.id,
      isNew,
      payload: {
        slug: rot.slug,
        path: slugToPath(rot.slug),
        template: l.template as Template,
        content,
        pixelId: l.pixelId || (await this.settings.getAll(rot.account)).meta_pixel,
        /** Rotatsiya ekani — brauzerda kerak emas, lekin debug uchun foydali */
        rotation: { id: rot.id, variant: l.id, variants: live.length, mode: normMode(rot.mode) },
      },
    };
  }

  /** Buyurtma/analitika uchun: shu yo'l rotatsiyami va qaysi landing ko'rsatilgan. */
  async resolveForTracking(path: string, assigned?: string) {
    const slug = pathToSlug(path);
    if (!slug) return null;
    const rot = await this.full({ slug });
    if (!rot) return null;
    const live = rot.variants.filter((v) => v.active && v.landing.active);
    const picked =
      (assigned && rot.variants.find((v) => v.landingId === assigned)) || live[0] || rot.variants[0];
    return { rotation: rot, landing: picked?.landing ?? null };
  }

  /* -------------------------------------------------------------- admin */

  async list(account: Account) {
    const acc = normAccount(account);
    const rows = await this.prisma.rotation.findMany({
      where: { account: acc },
      orderBy: { createdAt: 'desc' },
      include: { variants: { include: { landing: true } } },
    });
    const since = new Date(Date.now() - 7 * 86_400_000);
    const paths = rows.map((r) => slugToPath(r.slug));
    const [sessions, leads] = await Promise.all([
      this.prisma.session.groupBy({
        by: ['page'],
        where: { page: { in: paths }, account: acc, firstSeen: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['page'],
        where: { page: { in: paths }, account: acc, createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);
    const sMap = new Map(sessions.map((r) => [r.page, r._count._all]));
    const lMap = new Map(leads.map((r) => [r.page, r._count._all]));
    return rows.map((r) => {
      const path = slugToPath(r.slug);
      const clicks = sMap.get(path) || 0;
      const lids = lMap.get(path) || 0;
      return {
        id: r.id,
        slug: r.slug,
        path,
        name: r.name,
        active: r.active,
        mode: normMode(r.mode),
        templates: [...new Set(r.variants.filter((v) => v.active).map((v) => v.landing.template))],
        total: r.variants.length,
        live: r.variants.filter((v) => v.active && v.landing.active).length,
        images: r.variants.slice(0, 4).map((v) => sanitizeContent(v.landing.content).images[0] || ''),
        stats7d: { clicks, leads: lids, cr: clicks ? Math.round((lids / clicks) * 1000) / 10 : 0 },
        updatedAt: r.updatedAt,
      };
    });
  }

  async get(id: string, account?: Account) {
    const r = await this.own(id, account);
    return this.toDto(r);
  }

  private toDto(r: FullRotation) {
    return {
      id: r.id,
      slug: r.slug,
      path: slugToPath(r.slug),
      name: r.name,
      active: r.active,
      mode: normMode(r.mode),
      autoWinner: r.autoWinner,
      autoMinViews: r.autoMinViews,
      account: r.account,
      variants: r.variants.map((v) => ({
        id: v.id,
        landingId: v.landingId,
        active: v.active,
        sortOrder: v.sortOrder,
        weight: clampWeight(v.weight),
        since: v.since,
        autoOffAt: v.autoOffAt,
        autoOffNote: v.autoOffNote,
        name: v.landing.name,
        path: slugToPath(v.landing.slug),
        template: v.landing.template,
        landingActive: v.landing.active,
        image: sanitizeContent(v.landing.content).images[0] || '',
        offerId: v.landing.offerId,
        stream: v.landing.stream,
      })),
    };
  }

  private async own(id: string, account?: Account) {
    const r = await this.full({ id });
    if (!r) throw new NotFoundException('Rotatsiya topilmadi');
    if (account && r.account !== normAccount(account)) {
      throw new NotFoundException('Rotatsiya bu akkauntda topilmadi');
    }
    return r;
  }

  async create(account: Account, input: RotationInput) {
    const acc = normAccount(account);
    const name = (input.name || '').trim().slice(0, 120);
    if (!name) throw new BadRequestException('Nom kiriting');
    const slug = await this.checkSlug(input.slug);
    let ids = [...new Set(input.landingIds || [])];
    if (input.baseLandingId) {
      const base = await this.prisma.landing.findUnique({ where: { id: input.baseLandingId } });
      if (!base || base.account !== acc) {
        throw new BadRequestException('Asosiy landing bu akkauntga tegishli emas');
      }
      const templates = this.checkTemplates(input.templates).filter((t) => t !== base.template);
      if (templates.length + 1 < 2) {
        throw new BadRequestException('Kamida 1 ta boshqa shablon tanlang');
      }
      ids = [base.id, ...(await this.cloneWithTemplates(base, templates))];
    }
    if (ids.length < 2) {
      throw new BadRequestException('Kamida 2 ta landing tanlang — rotatsiya shular orasida aylanadi');
    }
    const landings = await this.prisma.landing.findMany({ where: { id: { in: ids }, account: acc } });
    if (landings.length !== ids.length) {
      throw new BadRequestException('Tanlangan landinglardan biri bu akkauntga tegishli emas');
    }
    const r = await this.prisma.rotation.create({
      data: {
        account: acc,
        name,
        slug,
        active: input.active ?? true,
        mode: normMode(input.mode),
        variants: {
          create: ids.map((landingId, i) => ({ landingId, sortOrder: i })),
        },
      },
      include: { variants: { include: { landing: true } } },
    });
    this.log.log(`yangi rotatsiya /${slug} — ${ids.length} ta landing`);
    return this.toDto(r as FullRotation);
  }

  async update(id: string, input: RotationInput, account?: Account) {
    const cur = await this.own(id, account);
    const data: Prisma.RotationUpdateInput = {};
    if (input.mode !== undefined) data.mode = normMode(input.mode);
    if (input.autoWinner !== undefined) data.autoWinner = !!input.autoWinner;
    if (input.autoMinViews !== undefined) {
      data.autoMinViews = Math.min(5000, Math.max(20, Math.round(Number(input.autoMinViews)) || 100));
    }
    if (input.name !== undefined) {
      const name = input.name.trim().slice(0, 120);
      if (!name) throw new BadRequestException('Nom kiriting');
      data.name = name;
    }
    if (input.slug !== undefined) data.slug = await this.checkSlug(input.slug, id);
    if (input.active !== undefined) data.active = !!input.active;
    await this.prisma.rotation.update({ where: { id }, data });
    if (data.autoWinner || data.autoMinViews !== undefined) await this.autoCheck(id);
    return this.get(id, account ?? cur.account);
  }

  async remove(id: string, account?: Account) {
    await this.own(id, account);
    await this.prisma.rotation.delete({ where: { id } });
    return { ok: true };
  }

  /** Rotatsiyaga landing qo'shish. */
  async addVariant(id: string, landingId: string, account?: Account) {
    const rot = await this.own(id, account);
    const landing = await this.prisma.landing.findUnique({ where: { id: landingId } });
    if (!landing || landing.account !== rot.account) {
      throw new BadRequestException('Landing bu akkauntga tegishli emas');
    }
    if (rot.variants.some((v) => v.landingId === landingId)) {
      throw new ConflictException('Bu landing allaqachon qo‘shilgan');
    }
    const last = rot.variants.reduce((m, v) => Math.max(m, v.sortOrder), -1);
    await this.prisma.rotationVariant.create({
      data: { rotationId: id, landingId, sortOrder: last + 1 },
    });
    return this.get(id, account);
  }

  /**
   * Bitta landingni tanlangan shablonlarda nusxalab rotatsiyaga qo'shadi —
   * matn, rasm, market sozlamalari bir xil, faqat dizayn har xil.
   */
  async addTemplateVariants(id: string, landingId: string, templates: unknown, account?: Account) {
    const rot = await this.own(id, account);
    const base = await this.prisma.landing.findUnique({ where: { id: landingId } });
    if (!base || base.account !== rot.account) {
      throw new BadRequestException('Landing bu akkauntga tegishli emas');
    }
    const list = this.checkTemplates(templates);
    if (!list.length) throw new BadRequestException('Kamida bitta shablon tanlang');
    const ids = await this.cloneWithTemplates(base, list);
    const last = rot.variants.reduce((m, v) => Math.max(m, v.sortOrder), -1);
    await this.prisma.rotationVariant.createMany({
      data: ids.map((landingId, i) => ({ rotationId: id, landingId, sortOrder: last + 1 + i })),
    });
    return this.get(id, account);
  }

  private checkTemplates(raw: unknown): Template[] {
    const all = Object.keys(TEMPLATE_LABEL) as Template[];
    const list = Array.isArray(raw) ? raw.map(String) : [];
    return [...new Set(list)].filter((t): t is Template => all.includes(t as Template));
  }

  private async cloneWithTemplates(base: Landing, templates: Template[]) {
    const root = (base.slug || 'landing').slice(0, 40);
    const ids: string[] = [];
    for (const template of templates) {
      let slug = `${root}-${template}`;
      for (let i = 2; await this.slugTaken(slug); i++) slug = `${root}-${template}-${i}`;
      const last = await this.prisma.landing.aggregate({ _max: { sortOrder: true } });
      const l = await this.prisma.landing.create({
        data: {
          account: base.account,
          name: `${base.name.replace(/ · [^·]+$/, '')} · ${TEMPLATE_LABEL[template]}`.slice(0, 120),
          slug,
          template,
          active: true,
          content: base.content as Prisma.InputJsonValue,
          pixelId: base.pixelId,
          marketId: base.marketId,
          stream: base.stream,
          offerId: base.offerId,
          sortOrder: (last._max.sortOrder ?? -1) + 1,
        },
      });
      ids.push(l.id);
    }
    this.log.log(`/${root} — ${ids.length} ta shablon nusxasi yaratildi`);
    return ids;
  }

  private async slugTaken(slug: string) {
    if (RESERVED.has(slug)) return true;
    const [l, r] = await Promise.all([
      this.prisma.landing.findUnique({ where: { slug }, select: { id: true } }),
      this.prisma.rotation.findUnique({ where: { slug }, select: { id: true } }),
    ]);
    return !!(l || r);
  }

  /** Variantni yoqish/o'chirish (o'chirilgani ko'rsatilmaydi, lekin statistikasi qoladi). */
  /**
   * Variantni yoqish/o'chirish va trafik ulushini o'zgartirish.
   * Qayta yoqilganda avtomatik g'olib uchun hisob noldan boshlanadi — eski natijasi
   * sabab darrov yana o'chib qolmasligi uchun.
   */
  async setVariant(
    id: string,
    variantId: string,
    patch: { active?: boolean; weight?: number },
    account?: Account,
  ) {
    const rot = await this.own(id, account);
    const v = rot.variants.find((x) => x.id === variantId);
    if (!v) throw new NotFoundException('Variant topilmadi');
    if (patch.active === false && rot.variants.filter((x) => x.active).length <= 1) {
      throw new BadRequestException(
        'Kamida bitta variant yoqilgan bo‘lishi kerak — aks holda havola ochilmaydi',
      );
    }
    const data: Prisma.RotationVariantUpdateInput = {};
    if (patch.active !== undefined && patch.active !== v.active) {
      data.active = patch.active;
      if (patch.active) Object.assign(data, { since: new Date(), autoOffAt: null, autoOffNote: '' });
    }
    if (patch.weight !== undefined) data.weight = clampWeight(patch.weight);
    await this.prisma.rotationVariant.update({ where: { id: variantId }, data });
    return this.get(id, account);
  }

  /** Variantni ro'yxatdan butunlay olib tashlash. */
  async removeVariant(id: string, variantId: string, account?: Account) {
    const rot = await this.own(id, account);
    if (rot.variants.length <= 2) {
      throw new BadRequestException('Rotatsiyada kamida 2 ta landing qolishi kerak');
    }
    await this.prisma.rotationVariant.delete({ where: { id: variantId } });
    return this.get(id, account);
  }

  /** Tartibni o'zgartirish (yuqori/past). */
  async move(id: string, variantId: string, dir: 'up' | 'down', account?: Account) {
    const rot = await this.own(id, account);
    const list = [...rot.variants];
    const i = list.findIndex((v) => v.id === variantId);
    if (i < 0) throw new NotFoundException('Variant topilmadi');
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return this.get(id, account);
    [list[i], list[j]] = [list[j], list[i]];
    await this.prisma.$transaction(
      list.map((v, idx) =>
        this.prisma.rotationVariant.update({ where: { id: v.id }, data: { sortOrder: idx } }),
      ),
    );
    return this.get(id, account);
  }

  /** Bitta rotatsiyaning to'liq statistikasi — variantlar kesimida. */
  async stats(id: string, win: TimeWindow, account?: Account) {
    let rot = await this.own(id, account);
    if (rot.autoWinner && (await this.autoCheck(id)).length) rot = await this.own(id, account);
    const path = slugToPath(rot.slug);
    const fresh = new Map((await this.variantCounts(rot)).map((c) => [c.id, c]));
    const liveWeight = rot.variants
      .filter((v) => v.active && v.landing.active)
      .reduce((s, v) => s + clampWeight(v.weight), 0);
    const where = { page: path, account: rot.account, firstSeen: { gte: win.since, lt: win.until } };

    const [sessions, leads] = await Promise.all([
      this.prisma.session.findMany({
        where,
        select: { variant: true, converted: true, dwellMs: true, maxScroll: true },
      }),
      this.prisma.lead.findMany({
        where: {
          page: path,
          account: rot.account,
          createdAt: { gte: win.since, lt: win.until },
        },
        select: { variant: true, status: true },
      }),
    ]);

    const agg = new Map<
      string,
      { sessions: number; conv: number; leads: number; sent: number; dwell: number; scroll: number }
    >();
    const bucket = (k: string) => {
      let c = agg.get(k);
      if (!c) {
        c = { sessions: 0, conv: 0, leads: 0, sent: 0, dwell: 0, scroll: 0 };
        agg.set(k, c);
      }
      return c;
    };
    for (const s of sessions) {
      const c = bucket(s.variant || '—');
      c.sessions++;
      if (s.converted) c.conv++;
      c.dwell += s.dwellMs || 0;
      c.scroll += s.maxScroll || 0;
    }
    for (const l of leads) {
      const c = bucket(l.variant || '—');
      c.leads++;
      if (l.status === 'sent') c.sent++;
    }

    const variants = rot.variants.map((v) => {
      const c = agg.get(v.landingId) || { sessions: 0, conv: 0, leads: 0, sent: 0, dwell: 0, scroll: 0 };
      return {
        id: v.id,
        landingId: v.landingId,
        name: v.landing.name,
        path: slugToPath(v.landing.slug),
        template: v.landing.template,
        active: v.active,
        landingActive: v.landing.active,
        sortOrder: v.sortOrder,
        image: sanitizeContent(v.landing.content).images[0] || '',
        sessions: c.sessions,
        leads: c.leads,
        sent: c.sent,
        cr: c.sessions ? Math.round((c.leads / c.sessions) * 1000) / 10 : 0,
        avgDwellSec: c.sessions ? Math.round(c.dwell / c.sessions / 1000) : 0,
        avgScroll: c.sessions ? Math.round(c.scroll / c.sessions) : 0,
        weight: clampWeight(v.weight),
        /** Hozirgi trafik ulushi, % (o'chiq variant — 0) */
        share:
          v.active && v.landing.active && liveWeight
            ? Math.round((clampWeight(v.weight) / liveWeight) * 100)
            : 0,
        /** Avtomatik g'olib uchun: qayta yoqilgandan beri yig'ilgan ko'rish/lid */
        freshViews: fresh.get(v.id)?.views ?? 0,
        freshLeads: fresh.get(v.id)?.leads ?? 0,
        autoOffAt: v.autoOffAt,
        autoOffNote: v.autoOffNote,
      };
    });

    const totalSessions = sessions.length;
    const totalLeads = leads.length;
    // "G'olib" — kamida 20 ta ko'rish bo'lgan variantlar orasida eng yuqori CR
    const ranked = variants.filter((v) => v.sessions >= 20).sort((a, b) => b.cr - a.cr);
    const winner = ranked.length > 1 && ranked[0].cr > ranked[1].cr ? ranked[0].landingId : '';

    return {
      rotation: this.toDto(rot),
      range: win.range,
      day: win.day,
      totals: {
        sessions: totalSessions,
        leads: totalLeads,
        cr: totalSessions ? Math.round((totalLeads / totalSessions) * 1000) / 10 : 0,
        sent: leads.filter((l) => l.status === 'sent').length,
      },
      variants: variants.sort((a, b) => a.sortOrder - b.sortOrder),
      winner,
      /** Ko'rsatish uchun yetarli ma'lumot yig'ilganmi (har variantga ~100 ko'rish) */
      enough: variants.every((v) => !v.active || v.sessions >= 100),
    };
  }

  /** Slug Landing va Rotation jadvallari bo'ylab yagona bo'lishi kerak. */
  private async checkSlug(raw: unknown, selfId?: string) {
    const slug = normSlug(raw);
    if (!slug) throw new BadRequestException('URL manzilini kiriting');
    if (RESERVED.has(slug)) throw new BadRequestException(`"/${slug}" manzili band`);
    const landing = await this.prisma.landing.findUnique({ where: { slug } });
    if (landing) {
      throw new ConflictException(`"/${slug}" — bu manzilda landing bor, boshqasini tanlang`);
    }
    const rot = await this.prisma.rotation.findUnique({ where: { slug } });
    if (rot && rot.id !== selfId) {
      throw new ConflictException(`"/${slug}" manzili boshqa rotatsiyada ishlatilgan`);
    }
    return slug;
  }
}
