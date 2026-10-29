import { Logger } from '@nestjs/common';

const log = new Logger('MarketForward');

/** Majburiy maydonlar + ShoxMarket CAPI atributsiyasi (ixtiyoriy). */
export type ForwardFields = {
  api_key: string;
  stream: string;
  offer_id: string;
  name: string;
  phone: string;
  lead_id?: string;
  fbclid?: string;
  fbc?: string;
  fbp?: string;
  ctwa_clid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  page_url?: string;
  client_ip?: string;
  user_agent?: string;
  event_id?: string;
};

export type ForwardResult = {
  ok: boolean;
  id?: string;
  message?: string;
};

function buildBody(fields: ForwardFields): URLSearchParams {
  const body = new URLSearchParams();
  for (const [key, val] of Object.entries(fields)) {
    if (val == null) continue;
    const s = String(val).trim();
    if (!s) continue;
    body.set(key, s);
  }
  // fbc bo'lmasa, lekin fbclid bo'lsa — ShoxMarket formatida yasaymiz
  if (!body.get('fbc') && body.get('fbclid')) {
    body.set('fbc', `fb.1.${Date.now()}.${body.get('fbclid')}`);
  }
  return body;
}

/**
 * "AliTrend" CPA tizimidagi marketlar (ShoxMarket, Amiram, ...) uchun yagona uzatish.
 * POST <endpoint> form-urlencoded: majburiy api_key/stream/offer_id/name/phone + ixtiyoriy CAPI maydonlari.
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
      body: buildBody(fields).toString(),
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
      (typeof data.msg === 'string' && data.msg) ||
      (ok ? 'ok' : `HTTP ${res.status} ${String(data.raw ?? '').slice(0, 120)}`.trim());
    return { ok, id: data.id != null ? String(data.id) : undefined, message };
  } catch (e) {
    log.error(`uzatishda xato (${endpoint}): ${String(e)}`);
    return { ok: false, message: 'Tarmoq xatosi' };
  }
}
