import { Injectable, Logger } from '@nestjs/common';
import { Account, DEFAULT_ACCOUNT, normAccount } from '../common/account';
import { LandingsService } from '../landings/landings.service';
import { forwardLead } from '../markets/market-forward';
import { MarketsService } from '../markets/markets.service';
import { PrismaService } from '../prisma/prisma.service';

type OrderMeta = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  referrer?: string;
  page?: string;
  ua?: string;
};

export type OrderInput = {
  name?: string;
  phone?: string;
  sid?: string;
  vid?: string;
  meta?: OrderMeta;
};

/** Bitta tashrif buyuruvchi (cookie yoki telefon) yubora oladigan maksimal buyurtma soni. */
const MAX_ORDERS_PER_VISITOR = 3;

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
export class OrdersService {
  private readonly log = new Logger('Orders');

  constructor(
    private readonly prisma: PrismaService,
    private readonly landings: LandingsService,
    private readonly markets: MarketsService,
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

    const vid = clip(input.vid, 64);
    const previous = await this.prisma.lead.count({
      where: { OR: [{ phone }, ...(vid ? [{ vid }] : [])] },
    });
    if (previous >= MAX_ORDERS_PER_VISITOR) {
      return {
        ok: false,
        limited: true,
        message: `Siz ${MAX_ORDERS_PER_VISITOR} ta buyurtma yuborgansiz. Operatorimiz tez orada siz bilan bog‘lanadi.`,
      };
    }

    // Buyurtma kelgan landing — akkaunt, market, oqim va mahsulotni shu belgilaydi
    const meta = input.meta || {};
    const landing = await this.landings.findByPath(meta.page);
    const account: Account = landing ? normAccount(landing.account) : DEFAULT_ACCOUNT;
    const market = await this.markets.resolve(account, landing?.marketId);
    const stream = (landing?.stream || market?.defaultStream || '').trim();
    const offerId = (landing?.offerId || market?.defaultOfferId || '').trim();

    const lead = await this.prisma.lead.create({
      data: {
        name,
        phone,
        account,
        marketId: market?.id || null,
        marketName: market?.name || null,
        offerId: offerId || null,
        stream: stream || null,
        status: 'new',
        sid: clip(input.sid, 64) || null,
        vid: vid || null,
        page: clip(meta.page, 120) || null,
        utmSource: clip(meta.utmSource, 60) || null,
        utmMedium: clip(meta.utmMedium, 60) || null,
        utmCampaign: clip(meta.utmCampaign, 80) || null,
        utmContent: clip(meta.utmContent, 80) || null,
        referrer: clip(meta.referrer, 300) || null,
        ua: clip(meta.ua, 300) || null,
      },
    });

    // Analitika: sessiyani konversiya deb belgilaymiz
    if (lead.sid) {
      await this.markConverted(lead.sid).catch(() => {});
    }

    const forward = market
      ? await forwardLead(market.endpoint, {
          api_key: market.apiKey,
          stream,
          offer_id: offerId,
          name,
          phone,
        })
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
  async retry(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) return { ok: false, message: 'Buyurtma topilmadi' };
    const landing = await this.landings.findByPath(lead.page || '/');
    const market = await this.markets.resolve(
      normAccount(lead.account),
      lead.marketId || landing?.marketId,
    );
    if (!market) return { ok: false, message: 'Market sozlanmagan' };
    const stream = (landing?.stream || lead.stream || market.defaultStream || '').trim();
    const offerId = (landing?.offerId || lead.offerId || market.defaultOfferId || '').trim();
    const forward = await forwardLead(market.endpoint, {
      api_key: market.apiKey,
      stream,
      offer_id: offerId,
      name: lead.name,
      phone: lead.phone,
    });
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
      },
    });
    return { ok: forward.ok, message: forward.message };
  }

  async list(params: { limit?: number; status?: string; account?: Account } = {}) {
    const limit = Math.min(500, Math.max(1, params.limit || 200));
    const account = normAccount(params.account);
    const where = {
      account,
      ...(params.status ? { status: params.status } : {}),
    };
    const [rows, total, sent, failed] = await Promise.all([
      this.prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
      this.prisma.lead.count({ where: { account } }),
      this.prisma.lead.count({ where: { account, status: 'sent' } }),
      this.prisma.lead.count({ where: { account, status: 'failed' } }),
    ]);
    return { ok: true, rows, stats: { total, sent, failed } };
  }
}
