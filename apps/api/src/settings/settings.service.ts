import { Injectable } from '@nestjs/common';
import { Account, scopedKey } from '../common/account';
import { PrismaService } from '../prisma/prisma.service';

/** Integratsiya sozlamalari — hammasi maxfiy, faqat serverda ishlatiladi. */
export const SETTING_KEYS = [
  'shox_endpoint',
  'shox_api_key',
  'shox_stream',
  'shox_offer_id',
  // landingda o'z Pixel ID'si bo'lmasa ishlatiladigan standart pixel
  'meta_pixel',
  'meta_capi_token',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export function parsePixelIds(raw: string) {
  return String(raw || '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => /^\d{5,20}$/.test(x));
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(account: Account = 'nazir'): Promise<Record<SettingKey, string>> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: SETTING_KEYS.map((k) => scopedKey(account, k)) } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    const out = {} as Record<SettingKey, string>;
    for (const k of SETTING_KEYS) out[k] = byKey.get(scopedKey(account, k)) ?? '';
    return out;
  }

  async patch(account: Account, values: Record<string, unknown>) {
    const entries = Object.entries(values).filter(([k]) =>
      (SETTING_KEYS as readonly string[]).includes(k),
    );
    for (const [key, value] of entries) {
      const sk = scopedKey(account, key);
      const v = String(value ?? '').trim().slice(0, 1000);
      await this.prisma.setting.upsert({
        where: { key: sk },
        create: { key: sk, value: v },
        update: { value: v },
      });
    }
    return this.getAll(account);
  }

  /** Pixel ID'ni Meta serveridan tekshiradi. */
  async checkPixel(rawId: string) {
    const id = parsePixelIds(rawId)[0];
    if (!id) return { ok: false, code: 'empty', message: 'Pixel ID noto‘g‘ri yoki kiritilmagan' };
    const meta = await this.probeMetaPixel(id);
    if (meta === false) {
      return { ok: false, code: 'meta_invalid', message: `Meta'da bunday Pixel topilmadi (${id})`, id };
    }
    if (meta === null) {
      return { ok: false, code: 'unknown', message: 'Meta bilan bog‘lanib bo‘lmadi, keyinroq urinib ko‘ring', id };
    }
    return { ok: true, code: 'live', message: `Pixel faol ✓ (${id})`, id };
  }

  /** CAPI tokenini Graph API orqali tekshiradi. */
  async checkCapi(token: string, pixelId: string) {
    const id = parsePixelIds(pixelId)[0];
    if (!token.trim()) return { ok: false, message: 'Access token kiritilmagan' };
    if (!id) return { ok: false, message: 'Avval standart Pixel ID kiriting' };
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${id}?fields=id,name&access_token=${encodeURIComponent(token.trim())}`,
        { signal: AbortSignal.timeout(9000) },
      );
      const json = (await res.json().catch(() => ({}))) as {
        name?: string;
        error?: { message?: string };
      };
      if (!res.ok) return { ok: false, message: json.error?.message || `HTTP ${res.status}` };
      return { ok: true, message: `Token ishlayapti ✓ (${json.name || id})` };
    } catch {
      return { ok: false, message: 'Meta bilan bog‘lanib bo‘lmadi' };
    }
  }

  /** true = Meta tasdiqladi, false = noto‘g‘ri, null = tekshirib bo‘lmadi */
  private async probeMetaPixel(id: string): Promise<boolean | null> {
    try {
      const url = `https://connect.facebook.net/signals/config/${id}?v=2.9.215&r=stable`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(9000),
        headers: { 'User-Agent': 'IlimbooksPixelCheck/1.0' },
      });
      const text = await res.text();
      if (/Invalid PixelID|invalid pixel/i.test(text)) return false;
      if (res.ok && text.length > 40 && text.includes(id)) return true;
      if (res.ok && text.length < 20) return false;
      return null;
    } catch {
      return null;
    }
  }
}
