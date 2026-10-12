import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Landing, Prisma } from '@prisma/client';
import { Account, DEFAULT_ACCOUNT, normAccount } from '../common/account';
import { MarketsService } from '../markets/markets.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  DEFAULT_CONTENT,
  LandingContent,
  TEMPLATES,
  Template,
  normSlug,
  pathToSlug,
  sanitizeContent,
  slugToPath,
} from './landing-content';
import { findPreset, PRESETS } from './landing-presets';

/** Landing app / nginx bilan to'qnashadigan yo'llar. */
const RESERVED = new Set(['api', 'assets', 'product', 'uploads', 'admin', 'favicon-svg', 't']);

export type LandingInput = {
  name?: string;
  slug?: string;
  presetId?: string;
  template?: string;
  active?: boolean;
  content?: unknown;
  pixelId?: string;
  marketId?: string | null;
  stream?: string;
  offerId?: string;
};

function toDto(l: Landing) {
  return {
    id: l.id,
    slug: l.slug,
    path: slugToPath(l.slug),
    name: l.name,
    template: l.template as Template,
    active: l.active,
    content: sanitizeContent(l.content),
    pixelId: l.pixelId,
    account: l.account,
    marketId: l.marketId,
    stream: l.stream,
    offerId: l.offerId,
    sortOrder: l.sortOrder,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

@Injectable()
export class LandingsService implements OnModuleInit {
  private readonly log = new Logger('Landings');

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly markets: MarketsService,
  ) {}

  /** Birinchi ishga tushishda eski (kodga yozilgan) 2 ta landingni bazaga ko'chiradi. */
  async onModuleInit() {
    if ((await this.prisma.landing.count()) > 0) return;
    const rows = await this.prisma.setting.findMany();
    const s = new Map(rows.map((r) => [r.key, r.value]));
    const pick = (k: string, fb: string) => s.get(k)?.trim() || fb;
    const content: LandingContent = {
      ...DEFAULT_CONTENT,
      title: pick('product_title', DEFAULT_CONTENT.title),
      subtitle: pick('product_subtitle', DEFAULT_CONTENT.subtitle),
      priceOld: pick('price_old', DEFAULT_CONTENT.priceOld),
      priceNew: pick('price_new', DEFAULT_CONTENT.priceNew),
      currency: pick('currency', DEFAULT_CONTENT.currency),
      urgency: pick('urgency_text', DEFAULT_CONTENT.urgency),
      ctaText: pick('cta_primary', DEFAULT_CONTENT.ctaText),
      timerLabel: pick('hero_badge', DEFAULT_CONTENT.timerLabel),
      reviewsCount: pick('reviews_count', DEFAULT_CONTENT.reviewsCount),
    };
    const mainPixel = s.get('pixel_p9') || '';
    await this.prisma.landing.createMany({
      data: [
        {
          slug: '',
          name: 'Asosiy landing',
          template: 'full',
          content: content as unknown as Prisma.InputJsonValue,
          pixelId: mainPixel,
          sortOrder: 0,
        },
        {
          slug: '2',
          name: 'Kompakt landing',
          template: 'compact',
          content: { ...content, images: [content.images[0]] } as unknown as Prisma.InputJsonValue,
          pixelId: s.get('pixel_p2') || '',
          sortOrder: 1,
        },
      ],
    });
    this.log.log('Standart landinglar yaratildi (/ va /2)');
  }

  async list(account: Account = DEFAULT_ACCOUNT) {
    const acc = normAccount(account);
    const rows = await this.prisma.landing.findMany({
      where: { account: acc },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const since = new Date(Date.now() - 7 * 86_400_000);
    const paths = rows.map((l) => slugToPath(l.slug));
    const [sessions, leads, markets] = await Promise.all([
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
      this.prisma.market.findMany({ where: { account: acc } }),
    ]);
    const sMap = new Map(sessions.map((r) => [r.page, r._count._all]));
    const lMap = new Map(leads.map((r) => [r.page, r._count._all]));
    const mMap = new Map(markets.map((m) => [m.id, m]));
    const fallback = markets.find((m) => m.active);
    return rows.map((l) => {
      const path = slugToPath(l.slug);
      const market = (l.marketId && mMap.get(l.marketId)) || fallback || null;
      const stream = l.stream || market?.defaultStream || '';
      const offerId = l.offerId || market?.defaultOfferId || '';
      return {
        ...toDto(l),
        marketName: market?.name || '',
        marketCode: market?.code || '',
        /** Oqim yoki offer yo'q — lead marketga uzatilmaydi (bazada saqlanadi) */
        ready: !!(market?.apiKey && stream && offerId),
        missing: [
          !market?.apiKey ? 'api_key' : '',
          !stream ? 'oqim' : '',
          !offerId ? 'offer_id' : '',
        ].filter(Boolean),
        stats7d: { clicks: sMap.get(path) || 0, leads: lMap.get(path) || 0 },
      };
    });
  }

  presets() {
    return PRESETS;
  }

  async get(id: string, account?: Account) {
    return toDto(await this.own(id, account));
  }

  /** Landing shu akkauntga tegishli bo'lishi shart — akkauntlar bir-birinikini ko'rmaydi. */
  private async own(id: string, account?: Account) {
    const l = await this.prisma.landing.findUnique({ where: { id } });
    if (!l) throw new NotFoundException('Landing topilmadi');
    if (account && l.account !== normAccount(account)) {
      throw new NotFoundException('Landing bu akkauntda topilmadi');
    }
    return l;
  }

  /** Public: faqat faol landing. */
  async getPublicByPath(path: string) {
    const l = await this.prisma.landing.findUnique({ where: { slug: pathToSlug(path) } });
    if (!l || !l.active) return null;
    const d = toDto(l);
    return {
      slug: d.slug,
      path: d.path,
      template: d.template,
      content: d.content,
      pixelId: d.pixelId || (await this.settings.getAll(l.account)).meta_pixel,
    };
  }

  /** Buyurtma kelgan sahifaga mos landing (market oqimi/offer uchun). */
  findByPath(path: string | undefined) {
    return this.prisma.landing.findUnique({ where: { slug: pathToSlug(path || '/') } });
  }

  async create(account: Account, input: LandingInput) {
    const acc = normAccount(account);
    const name = (input.name || '').trim().slice(0, 120);
    if (!name) throw new BadRequestException('Landing nomini kiriting');
    const slug = await this.checkSlug(input.slug);
    const preset = input.presetId ? findPreset(input.presetId) : undefined;
    if (input.presetId && !preset) throw new BadRequestException('Shablon topilmadi');
    const template = this.checkTemplate(input.template ?? preset?.template);
    let base: LandingContent = DEFAULT_CONTENT;
    if (preset) base = preset.content;
    else {
      const first = await this.prisma.landing.findFirst({
        where: { account: acc },
        orderBy: { sortOrder: 'asc' },
      });
      if (first) base = sanitizeContent(first.content);
    }
    const content = sanitizeContent(input.content, base);
    const last = await this.prisma.landing.aggregate({
      where: { account: acc },
      _max: { sortOrder: true },
    });
    const marketId = await this.checkMarket(acc, input.marketId, preset?.marketCode);
    const l = await this.prisma.landing.create({
      data: {
        name,
        slug,
        template,
        account: acc,
        marketId,
        active: input.active ?? true,
        content: content as unknown as Prisma.InputJsonValue,
        pixelId: this.clean(input.pixelId, 200),
        stream: this.clean(input.stream, 80),
        offerId: this.clean(input.offerId ?? preset?.offerId, 40),
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    return toDto(l);
  }

  async update(id: string, input: LandingInput, account?: Account) {
    const cur = await this.own(id, account);
    const data: Prisma.LandingUpdateInput = {};
    if (input.name !== undefined) {
      const name = input.name.trim().slice(0, 120);
      if (!name) throw new BadRequestException('Landing nomini kiriting');
      data.name = name;
    }
    if (input.slug !== undefined) data.slug = await this.checkSlug(input.slug, id);
    if (input.template !== undefined) data.template = this.checkTemplate(input.template);
    if (input.active !== undefined) data.active = !!input.active;
    if (input.content !== undefined) {
      data.content = sanitizeContent(
        input.content,
        sanitizeContent(cur.content),
      ) as unknown as Prisma.InputJsonValue;
    }
    if (input.pixelId !== undefined) data.pixelId = this.clean(input.pixelId, 200);
    if (input.marketId !== undefined) {
      data.marketId = await this.checkMarket(cur.account, input.marketId);
    }
    if (input.stream !== undefined) data.stream = this.clean(input.stream, 80);
    if (input.offerId !== undefined) data.offerId = this.clean(input.offerId, 40);
    const l = await this.prisma.landing.update({ where: { id }, data });
    return toDto(l);
  }

  async duplicate(id: string, account?: Account) {
    const cur = await this.get(id, account);
    let slug = `${cur.slug || 'landing'}-nusxa`;
    for (let i = 2; await this.prisma.landing.findUnique({ where: { slug } }); i++) {
      slug = `${cur.slug || 'landing'}-nusxa-${i}`;
    }
    return this.create(cur.account, {
      name: `${cur.name} (nusxa)`,
      slug,
      template: cur.template,
      active: false,
      content: cur.content,
      pixelId: cur.pixelId,
      marketId: cur.marketId,
      stream: cur.stream,
      offerId: cur.offerId,
    });
  }

  async remove(id: string, account?: Account) {
    const cur = await this.own(id, account);
    if (cur.slug === '') {
      throw new BadRequestException('Bosh sahifa (/) landingini o‘chirib bo‘lmaydi');
    }
    await this.prisma.landing.delete({ where: { id } });
    return { ok: true };
  }

  private clean(v: unknown, max: number) {
    return typeof v === 'string' ? v.trim().slice(0, max) : '';
  }

  private checkTemplate(t: unknown): Template {
    const v = String(t || 'full') as Template;
    if (!TEMPLATES.includes(v)) throw new BadRequestException('Noma’lum shablon');
    return v;
  }

  /** Market shu akkauntga tegishli bo'lishi shart; bo'sh bo'lsa standart market. */
  private async checkMarket(
    account: Account,
    marketId?: string | null,
    preferCode?: string,
  ): Promise<string | null> {
    const acc = normAccount(account);
    if (marketId) {
      const m = await this.prisma.market.findUnique({ where: { id: marketId } });
      if (!m || m.account !== acc) throw new BadRequestException('Market bu akkauntga tegishli emas');
      return m.id;
    }
    if (preferCode) {
      const m = await this.prisma.market.findUnique({
        where: { account_code: { account: acc, code: preferCode } },
      });
      if (m) return m.id;
      // Shablon boshqa market katalogidan — offer_id mos kelmaydi, jim qolib ketmaymiz
      throw new BadRequestException(
        `Bu shablon "${preferCode}" marketiga tegishli, lekin bu akkauntda unday market yo‘q. Marketlar sahifasida qo‘shing yoki tegishli akkauntga o‘ting.`,
      );
    }
    const fallback = await this.markets.resolve(acc, null);
    return fallback?.id ?? null;
  }

  private async checkSlug(raw: unknown, selfId?: string) {
    const slug = normSlug(raw);
    if (RESERVED.has(slug)) {
      throw new BadRequestException(`"/${slug}" manzili band — boshqasini tanlang`);
    }
    const taken = await this.prisma.landing.findUnique({ where: { slug } });
    if (taken && taken.id !== selfId) {
      throw new ConflictException(`"${slugToPath(slug)}" manzili boshqa landingda ishlatilgan`);
    }
    return slug;
  }
}
