import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LandingsService } from '../landings/landings.service';
import { SettingsService } from '../settings/settings.service';

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
  return d.length === 9 ? `+998${d}` : `+998${d}`;
}

@Injectable()
export class OrdersService {
  private readonly log = new Logger('Orders');

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly landings: LandingsService,
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

    const s = await this.settings.getAll('nazir');
    const endpoint = (s.shox_endpoint || '').trim() || 'https://api.shoxmarket.uz/create';
    const apiKey = (s.shox_api_key || '').trim();
    const meta = input.meta || {};
    const landing = await this.landings.findByPath(meta.page);
    const stream = (landing?.shoxStream || s.shox_stream || '').trim();
    const offerId = (landing?.shoxOfferId || s.shox_offer_id || '').trim();

    const lead = await this.prisma.lead.create({
      data: {
        name,
        phone,
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

    // ShoxMarket API'ga uzatamiz
    const forward = await this.forward(endpoint, {
      api_key: apiKey,
      stream,
      offer_id: offerId,
      name,
      phone,
    });

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: forward.ok ? 'sent' : 'failed',
        shoxOk: forward.ok,
        shoxId: forward.id ? String(forward.id) : null,
        shoxMessage: forward.message?.slice(0, 300) || null,
      },
    });

    // Mijozga har doim muvaffaqiyat: lead saqlandi. Uzatish holati adminda ko‘rinadi.
    return { ok: true, id: lead.id, forwarded: forward.ok };
  }

  /** ShoxMarket /create — application/x-www-form-urlencoded */
  private async forward(
    endpoint: string,
    fields: Record<string, string>,
  ): Promise<{ ok: boolean; id?: string | number; message?: string }> {
    if (!fields.api_key) {
      this.log.warn('shox_api_key bo‘sh — uzatilmadi');
      return { ok: false, message: 'api_key sozlanmagan' };
    }
    try {
      const body = new URLSearchParams(fields).toString();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(12000),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text.slice(0, 200) };
      }
      const ok = data?.ok === true || data?.success === true;
      return {
        ok,
        id: data?.id,
        message: data?.message || (ok ? 'ok' : `HTTP ${res.status}`),
      };
    } catch (e) {
      this.log.error(`ShoxMarket uzatishda xato: ${String(e)}`);
      return { ok: false, message: 'Tarmoq xatosi' };
    }
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

  async list(params: { limit?: number; status?: string } = {}) {
    const limit = Math.min(500, Math.max(1, params.limit || 200));
    const where = params.status ? { status: params.status } : {};
    const [rows, total, sent, failed] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { status: 'sent' } }),
      this.prisma.lead.count({ where: { status: 'failed' } }),
    ]);
    return { ok: true, rows, stats: { total, sent, failed } };
  }
}
