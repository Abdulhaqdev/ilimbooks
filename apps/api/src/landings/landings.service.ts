import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Landing, Prisma } from '@prisma/client';
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
  shoxStream?: string;
  shoxOfferId?: string;
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
    shoxStream: l.shoxStream,
    shoxOfferId: l.shoxOfferId,
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

  async list() {
    const rows = await this.prisma.landing.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const since = new Date(Date.now() - 7 * 86_400_000);
    const paths = rows.map((l) => slugToPath(l.slug));
    const [sessions, leads] = await Promise.all([
      this.prisma.session.groupBy({
        by: ['page'],
        where: { page: { in: paths }, firstSeen: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['page'],
        where: { page: { in: paths }, createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);
    const sMap = new Map(sessions.map((r) => [r.page, r._count._all]));
    const lMap = new Map(leads.map((r) => [r.page, r._count._all]));
    return rows.map((l) => {
      const path = slugToPath(l.slug);
      return {
        ...toDto(l),
        stats7d: { clicks: sMap.get(path) || 0, leads: lMap.get(path) || 0 },
      };
    });
  }

  presets() {
    return PRESETS;
  }

  async get(id: string) {
    const l = await this.prisma.landing.findUnique({ where: { id } });
    if (!l) throw new NotFoundException('Landing topilmadi');
    return toDto(l);
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
      pixelId: d.pixelId || (await this.settings.getAll()).meta_pixel,
    };
  }

  /** Buyurtma kelgan sahifaga mos landing (ShoxMarket oqimi/offer uchun). */
  findByPath(path: string | undefined) {
    return this.prisma.landing.findUnique({ where: { slug: pathToSlug(path || '/') } });
  }

  async create(input: LandingInput) {
    const name = (input.name || '').trim().slice(0, 120);
    if (!name) throw new BadRequestException('Landing nomini kiriting');
    const slug = await this.checkSlug(input.slug);
    const preset = input.presetId ? findPreset(input.presetId) : undefined;
    if (input.presetId && !preset) throw new BadRequestException('Shablon topilmadi');
    const template = this.checkTemplate(input.template ?? preset?.template);
    let base: LandingContent = DEFAULT_CONTENT;
    if (preset) base = preset.content;
    else {
      const first = await this.prisma.landing.findFirst({ orderBy: { sortOrder: 'asc' } });
      if (first) base = sanitizeContent(first.content);
    }
    const content = sanitizeContent(input.content, base);
    const last = await this.prisma.landing.aggregate({ _max: { sortOrder: true } });
    const l = await this.prisma.landing.create({
      data: {
        name,
        slug,
        template,
        active: input.active ?? true,
        content: content as unknown as Prisma.InputJsonValue,
        pixelId: this.clean(input.pixelId, 200),
        shoxStream: this.clean(input.shoxStream, 80),
        shoxOfferId: this.clean(input.shoxOfferId ?? preset?.offerId, 40),
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    return toDto(l);
  }

  async update(id: string, input: LandingInput) {
    const cur = await this.prisma.landing.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('Landing topilmadi');
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
    if (input.shoxStream !== undefined) data.shoxStream = this.clean(input.shoxStream, 80);
    if (input.shoxOfferId !== undefined) data.shoxOfferId = this.clean(input.shoxOfferId, 40);
    const l = await this.prisma.landing.update({ where: { id }, data });
    return toDto(l);
  }

  async duplicate(id: string) {
    const cur = await this.get(id);
    let slug = `${cur.slug || 'landing'}-nusxa`;
    for (let i = 2; await this.prisma.landing.findUnique({ where: { slug } }); i++) {
      slug = `${cur.slug || 'landing'}-nusxa-${i}`;
    }
    return this.create({
      name: `${cur.name} (nusxa)`,
      slug,
      template: cur.template,
      active: false,
      content: cur.content,
      pixelId: cur.pixelId,
      shoxStream: cur.shoxStream,
      shoxOfferId: cur.shoxOfferId,
    });
  }

  async remove(id: string) {
    const cur = await this.prisma.landing.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('Landing topilmadi');
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
