import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Account, DEFAULT_ACCOUNT, normAccount } from '../common/account';
import { LandingsService } from '../landings/landings.service';
import { forwardLead, type ForwardFields } from '../markets/market-forward';
import { MarketsService } from '../markets/markets.service';
import { MetaCapiService } from '../meta/meta-capi.service';
import { PrismaService } from '../prisma/prisma.service';
import { pickVariant, RotationsService } from '../rotations/rotations.service';

type OrderMeta = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  page?: string;
  pageUrl?: string;
  ua?: string;
  variant?: string;
  fbclid?: string;
  fbc?: string;
  fbp?: string;
  eventId?: string;
};

export type OrderInput = {
  name?: string;
  phone?: string;
  sid?: string;
  vid?: string;
  /** Mijoz IP (X-Forwarded-For) — ShoxMarket CAPI uchun */
  clientIp?: string;
  meta?: OrderMeta;
  /** httpOnly cookie'lar — rotatsiya varianti shundan aniqlanadi */
  cookies?: Record<string, string>;
};

/** IP bo‘yicha takroriy lid oynasi (mobil NAT uchun qisqa) */
const DUP_IP_WINDOW_MS = 24 * 3_600_000;

/** Uzatilmagan buyurtma jami shuncha urinishgacha avtomatik qayta yuboriladi */
const AUTO_RETRY_MAX = 3;
const AUTO_RETRY_GAP_MS = 10 * 60_000;

function clip(v: unknown, n: number): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s ? s.slice(0, n) : undefined;
}

/** Telefonni +998XXXXXXXXX ko‘rinishiga keltiradi. */
function normPhone(raw: string): string {
  let d = String(raw || '').replace(/[^\d]/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  d = d.slice(-9); // oxirgi 9 raqam
  return `+998${d}`;
}

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Orders');
  private timer?: NodeJS.Timeout;

  onModuleInit() {
    this.timer = setInterval(() => {
      this.autoRetry().catch((e) => this.log.error(`avto qayta yuborish: ${String(e)}`));
    }, AUTO_RETRY_GAP_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly landings: LandingsService,
    private readonly markets: MarketsService,
    private readonly rotations: RotationsService,
    private readonly metaCapi: MetaCapiService,
  ) {}

  async create(input: OrderInput) {
    const name = clip(input.name, 120);
    const phoneRaw = clip(input.phone, 40);
    if (!name || !phoneRaw) {
      return { ok: false, message: 'Ism va telefon raqami majburiy' };
    }
    const phone = normPhone(phoneRaw);
    if (!/^\+998\d{9}$/.test(phone)) {
      return { ok: false, message: "Telefon raqami noto‘g‘ri" };
    }

    // Buyurtma kelgan sahifa — akkaunt, market, oqim va mahsulotni shu belgilaydi.
    // Rotatsiya havolasi bo'lsa, mijozga ko'rsatilgan variant landingi olinadi.
    const meta = input.meta || {};
    let landing = await this.landings.findByPath(meta.page);
    let variant: string | null = null;
    if (!landing) {
      const probe = await this.rotations.resolveForTracking(meta.page || '/');
      if (probe) {
        const picked = pickVariant(probe.rotation, meta.variant, input.cookies);
        const match = probe.rotation.variants.find((v) => v.landingId === picked);
        landing = match?.landing ?? probe.landing;
        variant = landing?.id ?? null;
      }
    }
    const account: Account = landing ? normAccount(landing.account) : DEFAULT_ACCOUNT;

    const vid = clip(input.vid, 64);
    const clientIp = clip(input.clientIp, 45);
    const page = clip(meta.page, 120) || null;

    const market = await this.markets.resolve(account, landing?.marketId);
    const stream = (landing?.stream || market?.defaultStream || '').trim();
    const offerId = (landing?.offerId || market?.defaultOfferId || '').trim();

    // Mahsulot (offer) bo‘yicha takror: telefon | vid | IP(24soat). offer yo‘q → page.
    const productScope: Prisma.LeadWhereInput = offerId
      ? { offerId }
      : page
        ? { page, offerId: null }
        : {};
    const identityOr: Prisma.LeadWhereInput[] = [{ phone }];
    if (vid) identityOr.push({ vid });
    if (clientIp) {
      identityOr.push({
        clientIp,
        createdAt: { gte: new Date(Date.now() - DUP_IP_WINDOW_MS) },
      });
    }
    const prior = Object.keys(productScope).length
      ? await this.prisma.lead.findFirst({
          where: {
            account,
            status: { not: 'duplicate' },
            ...productScope,
            OR: identityOr,
          },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        })
      : null;

    const lead = await this.prisma.lead.create({
      data: {
        name,
        phone,
        account,
        marketId: market?.id || null,
        marketName: market?.name || null,
        variant,
        offerId: offerId || null,
        stream: stream || null,
        status: prior ? 'duplicate' : 'new',
        duplicateOf: prior?.id || null,
        sid: clip(input.sid, 64) || null,
        vid: vid || null,
        page,
        utmSource: clip(meta.utmSource, 60) || null,
        utmMedium: clip(meta.utmMedium, 60) || null,
        utmCampaign: clip(meta.utmCampaign, 80) || null,
        utmContent: clip(meta.utmContent, 80) || null,
        utmTerm: clip(meta.utmTerm, 80) || null,
        referrer: clip(meta.referrer, 300) || null,
        ua: clip(meta.ua, 512) || null,
        fbclid: clip(meta.fbclid, 512) || null,
        fbc: clip(meta.fbc, 512) || null,
        fbp: clip(meta.fbp, 255) || null,
        pageUrl: clip(meta.pageUrl, 1000) || null,
        clientIp: clientIp || null,
        eventId: clip(meta.eventId, 64) || null,
        shoxMessage: prior ? 'Qayta lid — marketga yuborilmadi' : null,
      },
    });

    // Analitika: faqat yangi (asl) lid uchun konversiya
    if (!prior && lead.sid) {
      await this.markConverted(lead.sid).catch(() => {});
    }

    if (prior) {
      // Mijozga muvaffaqiyat; marketga yuborilmaydi
      return { ok: true, id: lead.id, forwarded: false, duplicate: true };
    }

    const forward = market
      ? await forwardLead(market.endpoint, this.toForward(market.apiKey, stream, offerId, lead))
      : { ok: false, message: 'Market sozlanmagan' };

    if (!forward.ok) {
      this.log.warn(
        `lead ${lead.id} uzatilmadi (${market?.name || 'market yo‘q'}): ${forward.message}`,
      );
    }

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: forward.ok ? 'sent' : 'failed',
        shoxOk: forward.ok,
        shoxId: forward.id ? String(forward.id) : null,
        shoxMessage: forward.message?.slice(0, 300) || null,
        lastTryAt: new Date(),
      },
    });

    // Mijozga har doim muvaffaqiyat: lead saqlandi. Uzatish holati adminda ko'rinadi.
    return { ok: true, id: lead.id, forwarded: forward.ok };
  }

  private async markConverted(sid: string) {
    const session = await this.prisma.session.findUnique({ where: { sid } });
    if (!session) return;
    await this.prisma.session.update({
      where: { id: session.id },
      data: { converted: true, lastSeen: new Date() },
    });
    await this.prisma.event.create({
      data: { sessionId: session.id, type: 'cta', elId: 'order', elText: 'Buyurtma' },
    });
  }

  /** Qayta uzatish — oqim/offer tuzatilgandan keyin "failed" leadni yana yuborish. */
  async retry(id: string, account?: Account) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) return { ok: false, message: 'Buyurtma topilmadi' };
    if (lead.status === 'duplicate') {
      return { ok: false, message: 'Qayta lid — marketga yuborilmaydi' };
    }
    if (account && lead.account !== normAccount(account)) {
      return { ok: false, message: 'Bu buyurtma boshqa akkauntga tegishli' };
    }
    const landing =
      (await this.landings.findByPath(lead.page || '/')) ??
      (lead.variant ? await this.prisma.landing.findUnique({ where: { id: lead.variant } }) : null);
    const market = await this.markets.resolve(
      normAccount(lead.account),
      lead.marketId || landing?.marketId,
    );
    if (!market) return { ok: false, message: 'Market sozlanmagan' };
    const stream = (landing?.stream || lead.stream || market.defaultStream || '').trim();
    const offerId = (landing?.offerId || lead.offerId || market.defaultOfferId || '').trim();
    const forward = await forwardLead(
      market.endpoint,
      this.toForward(market.apiKey, stream, offerId, lead),
    );
    const wasFailed = lead.status === 'failed';
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        marketId: market.id,
        marketName: market.name,
        stream: stream || null,
        offerId: offerId || null,
        status: forward.ok ? 'sent' : 'failed',
        shoxOk: forward.ok,
        shoxId: forward.id ? String(forward.id) : null,
        shoxMessage: forward.message?.slice(0, 300) || null,
        tries: { increment: 1 },
        lastTryAt: new Date(),
      },
    });
    // Avval failed bo‘lgan lid endi marketga yetdi — Meta Lead (landingda bo‘lmagan)
    if (forward.ok && wasFailed) {
      await this.sendMetaLeadFor(lead).catch((e) =>
        this.log.warn(`retry Meta Lead ${lead.id}: ${String(e)}`),
      );
    }
    return { ok: forward.ok, message: forward.message };
  }

  /** Marketga yetgan lid uchun CAPI Lead (retry / avto-qayta yuborish). */
  private async sendMetaLeadFor(lead: {
    eventId?: string | null;
    page?: string | null;
    pageUrl?: string | null;
    clientIp?: string | null;
    ua?: string | null;
    fbp?: string | null;
    fbc?: string | null;
  }) {
    const page = lead.page || '/';
    const landing =
      process.env.LANDING_URL?.replace(/\/$/, '') || 'https://ilimbooks.uz';
    const path = page.startsWith('/') ? page : `/${page}`;
    await this.metaCapi.sendEvent({
      eventName: 'Lead',
      eventId: lead.eventId || undefined,
      eventSourceUrl: lead.pageUrl || `${landing}${path === '/' ? '' : path}`,
      page: path,
      userAgent: lead.ua || undefined,
      clientIp: lead.clientIp || undefined,
      fbp: lead.fbp || undefined,
      fbc: lead.fbc || undefined,
      customData: { content_name: 'order' },
    });
  }

  /** Lead + market maydonlarini ShoxMarket /create formatiga aylantiradi. */
  private toForward(
    apiKey: string,
    stream: string,
    offerId: string,
    lead: {
      id: string;
      name: string;
      phone: string;
      utmSource?: string | null;
      utmMedium?: string | null;
      utmCampaign?: string | null;
      utmContent?: string | null;
      utmTerm?: string | null;
      fbclid?: string | null;
      fbc?: string | null;
      fbp?: string | null;
      pageUrl?: string | null;
      page?: string | null;
      clientIp?: string | null;
      ua?: string | null;
      eventId?: string | null;
    },
  ): ForwardFields {
    return {
      api_key: apiKey,
      stream,
      offer_id: offerId,
      name: lead.name,
      phone: lead.phone,
      lead_id: lead.id,
      fbclid: lead.fbclid || undefined,
      fbc: lead.fbc || undefined,
      fbp: lead.fbp || undefined,
      utm_source: lead.utmSource || undefined,
      utm_medium: lead.utmMedium || undefined,
      utm_campaign: lead.utmCampaign || undefined,
      utm_content: lead.utmContent || undefined,
      utm_term: lead.utmTerm || undefined,
      page_url: lead.pageUrl || undefined,
      client_ip: lead.clientIp || undefined,
      user_agent: lead.ua || undefined,
      event_id: lead.eventId || undefined,
    };
  }

  /** Akkauntdagi barcha uzatilmagan buyurtmalarni qayta yuborish (admin tugmasi). */
  async retryFailed(account: Account) {
    const rows = await this.prisma.lead.findMany({
      where: { account: normAccount(account), status: 'failed' },
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: { id: true },
    });
    let sent = 0;
    for (const r of rows) if ((await this.retry(r.id)).ok) sent++;
    return { ok: true, total: rows.length, sent };
  }

  /**
   * Fon jarayoni: so'nggi 24 soatdagi uzatilmagan buyurtmalarni 3 martagacha qayta yuboradi.
   * Shu raqam shu akkauntda allaqachon marketga yetgan bo'lsa — takror yuborilmaydi.
   */
  async autoRetry() {
    const now = Date.now();
    const rows = await this.prisma.lead.findMany({
      where: {
        status: 'failed',
        tries: { lt: AUTO_RETRY_MAX },
        createdAt: { gte: new Date(now - 24 * 3_600_000) },
        OR: [{ lastTryAt: null }, { lastTryAt: { lt: new Date(now - AUTO_RETRY_GAP_MS) } }],
      },
      take: 50,
    });
    for (const r of rows) {
      const delivered = await this.prisma.lead.count({
        where: { account: r.account, phone: r.phone, status: 'sent', id: { not: r.id } },
      });
      if (delivered) {
        await this.prisma.lead.update({
          where: { id: r.id },
          data: { tries: AUTO_RETRY_MAX, shoxMessage: 'Takror: shu raqam avval marketga yuborilgan' },
        });
        continue;
      }
      const res = await this.retry(r.id);
      this.log.log(`avto qayta yuborish ${r.id}: ${res.ok ? 'ok' : res.message}`);
    }
  }

  async list(
    params: {
      limit?: number;
      status?: string;
      account?: Account;
      page?: string;
      creative?: string;
      q?: string;
      since?: Date;
      until?: Date;
    } = {},
  ) {
    const limit = Math.min(5000, Math.max(1, params.limit || 200));
    const account = normAccount(params.account);
    const { since, until } = params;
    const needle = (params.q || '').trim().slice(0, 60);
    const digits = needle.replace(/\D/g, '');
    const base: Prisma.LeadWhereInput = {
      account,
      ...(since ? { createdAt: { gte: since, ...(until ? { lt: until } : {}) } } : {}),
      ...(params.page ? { page: params.page } : {}),
      ...(params.creative ? { utmContent: params.creative === '—' ? null : params.creative } : {}),
      ...(needle
        ? {
            OR: [
              { name: { contains: needle, mode: 'insensitive' as const } },
              ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
            ],
          }
        : {}),
    };
    const where = { ...base, ...(params.status ? { status: params.status } : {}) };

    const [rows, total, sent, failed, duplicate, pages, creatives] = await Promise.all([
      this.prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
      this.prisma.lead.count({ where: base }),
      this.prisma.lead.count({ where: { ...base, status: 'sent' } }),
      this.prisma.lead.count({ where: { ...base, status: 'failed' } }),
      this.prisma.lead.count({ where: { ...base, status: 'duplicate' } }),
      this.prisma.lead.groupBy({ by: ['page'], where: { account }, _count: { _all: true } }),
      this.prisma.lead.groupBy({ by: ['utmContent'], where: { account }, _count: { _all: true } }),
    ]);

    // Takroriy raqamlar va ko'rsatilgan landing nomi
    const phones = [...new Set(rows.map((r) => r.phone))];
    const landingIds = [...new Set(rows.map((r) => r.variant).filter(Boolean))] as string[];
    const [dups, landings] = await Promise.all([
      phones.length
        ? this.prisma.lead.groupBy({
            by: ['phone'],
            where: { account, phone: { in: phones } },
            _count: { _all: true },
          })
        : [],
      landingIds.length
        ? this.prisma.landing.findMany({ where: { id: { in: landingIds } }, select: { id: true, name: true } })
        : [],
    ]);
    const dupMap = new Map(dups.map((d) => [d.phone, d._count._all]));
    const nameMap = new Map(landings.map((l) => [l.id, l.name]));

    return {
      ok: true,
      rows: rows.map((r) => ({
        ...r,
        phoneCount: dupMap.get(r.phone) || 1,
        variantName: r.variant ? nameMap.get(r.variant) || null : null,
      })),
      stats: { total, sent, failed, duplicate },
      facets: {
        pages: pages
          .filter((p) => p.page)
          .sort((a, b) => b._count._all - a._count._all)
          .map((p) => ({ value: p.page as string, count: p._count._all })),
        creatives: creatives
          .sort((a, b) => b._count._all - a._count._all)
          .map((c) => ({ value: c.utmContent || '—', count: c._count._all })),
      },
    };
  }
}
