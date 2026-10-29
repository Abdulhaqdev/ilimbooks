import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Market } from '@prisma/client';
import { Account, normAccount } from '../common/account';
import { PrismaService } from '../prisma/prisma.service';
import { forwardLead } from './market-forward';

export type MarketInput = {
  code?: string;
  name?: string;
  endpoint?: string;
  apiKey?: string;
  defaultStream?: string;
  defaultOfferId?: string;
  active?: boolean;
};

/** Tanilgan CPA tizimlari — admin panelda bir klikda qo'shish uchun. */
export const KNOWN_MARKETS = [
  { code: 'shoxmarket', name: 'ShoxMarket', endpoint: 'https://api.shoxmarket.uz/create', panel: 'https://admin.shoxmarket.uz' },
  { code: 'amiram', name: 'Amiram', endpoint: 'https://api.Amiram.uz/create', panel: 'https://admin.amiram.uz' },
  { code: 'ziyomarket', name: 'Ziyomarket', endpoint: 'https://api.ziyomarket.uz/create', panel: 'https://admin.ziyomarket.uz' },
] as const;

/** API kaliti adminga to'liq ko'rsatilmaydi — faqat oxirgi 4 belgisi. */
function maskKey(key: string) {
  if (!key) return '';
  return key.length <= 4 ? '••••' : `••••${key.slice(-4)}`;
}

export function marketDto(m: Market) {
  return {
    id: m.id,
    account: m.account,
    code: m.code,
    name: m.name,
    endpoint: m.endpoint,
    apiKeyMask: maskKey(m.apiKey),
    hasApiKey: !!m.apiKey,
    defaultStream: m.defaultStream,
    defaultOfferId: m.defaultOfferId,
    active: m.active,
    sortOrder: m.sortOrder,
    updatedAt: m.updatedAt,
  };
}

@Injectable()
export class MarketsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(account: Account) {
    const rows = await this.prisma.market.findMany({
      where: { account: normAccount(account) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const counts = await this.prisma.landing.groupBy({
      by: ['marketId'],
      where: { account: normAccount(account) },
      _count: { _all: true },
    });
    const byId = new Map(counts.map((c) => [c.marketId, c._count._all]));
    return rows.map((m) => ({ ...marketDto(m), landings: byId.get(m.id) || 0 }));
  }

  /** Landing uchun market: aniq ko'rsatilgani, bo'lmasa akkauntning birinchi faol marketi. */
  async resolve(account: Account, marketId?: string | null): Promise<Market | null> {
    if (marketId) {
      const m = await this.prisma.market.findUnique({ where: { id: marketId } });
      if (m) return m;
    }
    return this.prisma.market.findFirst({
      where: { account: normAccount(account), active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(account: Account, input: MarketInput) {
    const acc = normAccount(account);
    const code = String(input.code || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '')
      .slice(0, 40);
    if (!code) throw new BadRequestException('Market kodini kiriting (lotin harflari)');
    const known = KNOWN_MARKETS.find((k) => k.code === code);
    const name = (input.name || known?.name || '').trim().slice(0, 80);
    if (!name) throw new BadRequestException('Market nomini kiriting');
    if (await this.prisma.market.findUnique({ where: { account_code: { account: acc, code } } })) {
      throw new ConflictException(`"${name}" bu akkauntga allaqachon qo‘shilgan`);
    }
    const last = await this.prisma.market.aggregate({
      where: { account: acc },
      _max: { sortOrder: true },
    });
    const m = await this.prisma.market.create({
      data: {
        account: acc,
        code,
        name,
        endpoint: (input.endpoint || known?.endpoint || '').trim().slice(0, 300),
        apiKey: (input.apiKey || '').trim().slice(0, 200),
        defaultStream: (input.defaultStream || '').trim().slice(0, 80),
        defaultOfferId: (input.defaultOfferId || '').trim().slice(0, 40),
        active: input.active ?? true,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    return marketDto(m);
  }

  async update(id: string, input: MarketInput) {
    const cur = await this.prisma.market.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('Market topilmadi');
    const data: Partial<Market> = {};
    if (input.name !== undefined) {
      const name = input.name.trim().slice(0, 80);
      if (!name) throw new BadRequestException('Market nomini kiriting');
      data.name = name;
    }
    if (input.endpoint !== undefined) data.endpoint = input.endpoint.trim().slice(0, 300);
    // bo'sh satr yuborilsa kalit o'zgarmaydi (admin maskalangan qiymatni qaytarmasin)
    if (input.apiKey !== undefined && input.apiKey.trim()) {
      data.apiKey = input.apiKey.trim().slice(0, 200);
    }
    if (input.defaultStream !== undefined) data.defaultStream = input.defaultStream.trim().slice(0, 80);
    if (input.defaultOfferId !== undefined) data.defaultOfferId = input.defaultOfferId.trim().slice(0, 40);
    if (input.active !== undefined) data.active = !!input.active;
    const m = await this.prisma.market.update({ where: { id }, data });
    return marketDto(m);
  }

  async remove(id: string) {
    const used = await this.prisma.landing.count({ where: { marketId: id } });
    if (used > 0) {
      throw new BadRequestException(`Bu market ${used} ta landingda ishlatilmoqda — avval ularni boshqa marketga o‘tkazing`);
    }
    await this.prisma.market.delete({ where: { id } });
    return { ok: true };
  }

  /** Market kalitlarini sinov lead yuborib tekshiradi (oqim/offer majburiy). */
  async check(id: string, stream?: string, offerId?: string) {
    const m = await this.prisma.market.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Market topilmadi');
    const res = await forwardLead(m.endpoint, {
      api_key: m.apiKey,
      stream: (stream || m.defaultStream || '').trim(),
      offer_id: (offerId || m.defaultOfferId || '').trim(),
      name: 'TEST sinov',
      phone: '+998900000000',
    });
    return {
      ok: res.ok,
      message: res.ok
        ? `Ulanish ishlayapti ✓ (sinov buyurtma #${res.id ?? '—'} — call-markaz uni e'tiborsiz qoldirsin)`
        : res.message || 'Xatolik',
    };
  }
}
