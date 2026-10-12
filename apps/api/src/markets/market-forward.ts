import { Logger } from '@nestjs/common';

const log = new Logger('MarketForward');

export type ForwardFields = {
  api_key: string;
  stream: string;
  offer_id: string;
  name: string;
  phone: string;
};

export type ForwardResult = {
  ok: boolean;
  id?: string;
  message?: string;
};

/**
 * "AliTrend" CPA tizimidagi marketlar (ShoxMarket, Amiram, ...) uchun yagona uzatish.
 * Hammasi bir xil: POST <endpoint> form-urlencoded api_key/stream/offer_id/name/phone,
 * javob — {ok:true,id:…} yoki {success:false,message:"…"}.
 */
export async function forwardLead(
  endpoint: string,
  fields: ForwardFields,
): Promise<ForwardResult> {
  if (!endpoint) return { ok: false, message: 'Market manzili sozlanmagan' };
  if (!fields.api_key) return { ok: false, message: 'api_key sozlanmagan' };
  if (!fields.stream) return { ok: false, message: 'oqim (stream) kiritilmagan' };
  if (!fields.offer_id) return { ok: false, message: 'offer_id kiritilmagan' };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...fields }).toString(),
      signal: AbortSignal.timeout(12000),
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { raw: text.slice(0, 200) };
    }
    const ok = data.ok === true || data.success === true;
    const message =
      (typeof data.message === 'string' && data.message) ||
      (ok ? 'ok' : `HTTP ${res.status} ${String(data.raw ?? '').slice(0, 120)}`.trim());
    return { ok, id: data.id != null ? String(data.id) : undefined, message };
  } catch (e) {
    log.error(`uzatishda xato (${endpoint}): ${String(e)}`);
    return { ok: false, message: 'Tarmoq xatosi' };
  }
}
