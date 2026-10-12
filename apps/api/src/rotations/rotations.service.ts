import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Landing, Rotation, RotationVariant } from '@prisma/client';
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

export type RotationInput = {
  name?: string;
  slug?: string;
  active?: boolean;
  landingIds?: string[];
};

type FullRotation = Rotation & { variants: (RotationVariant & { landing: Landing })[] };

/** Tashrifchiga berilgan variant shu cookie'da saqlanadi — qayta kirganda o'zgarmaydi. */
export function variantCookieName(rotationId: string) {
  return `ib_r_${rotationId}`;
}

@Injectable()
export class RotationsService {
  private readonly log = new Logger('Rotations');

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

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
   * - cookie'da oldingi tanlov bo'lsa va u hali faol bo'lsa — o'sha qaytadi (sahifa
   *   yangilanganda landing almashib ketmaydi, statistika ham buzilmaydi);
   * - aks holda navbatdagi variant (round-robin) beriladi va hisoblagich oshadi.
   */
  async resolvePublic(path: string, assigned?: string) {
    const slug = pathToSlug(path);
    if (!slug) return null;
    const rot = await this.full({ slug });
    if (!rot || !rot.active) return null;

    const live = rot.variants.filter((v) => v.active && v.landing.active);
    if (!live.length) return null;

    let variant = assigned ? live.find((v) => v.landingId === assigned) : undefined;
    const isNew = !variant;
    if (!variant) {
      // atomik oshirish — bir vaqtda kelgan tashrifchilar bir xil variantga tushmasligi uchun
      const { cursor } = await this.prisma.rotation.update({
        where: { id: rot.id },
        data: { cursor: { increment: 1 } },
        select: { cursor: true },
      });
      variant = live[(cursor - 1) % live.length];
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
        rotation: { id: rot.id, variant: l.id, variants: live.length },
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
      account: r.account,
      variants: r.variants.map((v) => ({
        id: v.id,
        landingId: v.landingId,
        active: v.active,
        sortOrder: v.sortOrder,
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
    const ids = [...new Set(input.landingIds || [])];
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
    const data: { name?: string; slug?: string; active?: boolean } = {};
    if (input.name !== undefined) {
      const name = input.name.trim().slice(0, 120);
      if (!name) throw new BadRequestException('Nom kiriting');
      data.name = name;
    }
    if (input.slug !== undefined) data.slug = await this.checkSlug(input.slug, id);
    if (input.active !== undefined) data.active = !!input.active;
    await this.prisma.rotation.update({ where: { id }, data });
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

  /** Variantni yoqish/o'chirish (o'chirilgani ko'rsatilmaydi, lekin statistikasi qoladi). */
  async setVariant(id: string, variantId: string, patch: { active?: boolean }, account?: Account) {
    const rot = await this.own(id, account);
    const v = rot.variants.find((x) => x.id === variantId);
    if (!v) throw new NotFoundException('Variant topilmadi');
    if (patch.active === false && rot.variants.filter((x) => x.active).length <= 1) {
      throw new BadRequestException(
        'Kamida bitta variant yoqilgan bo‘lishi kerak — aks holda havola ochilmaydi',
      );
    }
    await this.prisma.rotationVariant.update({
      where: { id: variantId },
      data: { active: patch.active ?? v.active },
    });
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
    const rot = await this.own(id, account);
    const path = slugToPath(rot.slug);
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
