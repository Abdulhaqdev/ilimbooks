export type Market = {
  id: string;
  account: string;
  code: string;
  name: string;
  endpoint: string;
  apiKeyMask: string;
  hasApiKey: boolean;
  defaultStream: string;
  defaultOfferId: string;
  active: boolean;
  sortOrder: number;
  landings: number;
  updatedAt: string;
};

export type KnownMarket = { code: string; name: string; endpoint: string; panel: string };

/** Market kodidan chiroyli nom (akkauntda market bo'lmasa ham ko'rsatish uchun). */
export const MARKET_NAME: Record<string, string> = {
  shoxmarket: 'ShoxMarket',
  amiram: 'Amiram',
  ziyomarket: 'Ziyomarket',
};

export function marketName(code: string, fallback = '') {
  return MARKET_NAME[code] || fallback || code;
}

/** Market paneli — admin oqim (stream) kalitini shu yerdan oladi. */
export const MARKET_PANEL: Record<string, string> = {
  shoxmarket: 'https://admin.shoxmarket.uz',
  amiram: 'https://admin.amiram.uz',
  ziyomarket: 'https://admin.ziyomarket.uz',
};

export function marketPanel(code: string) {
  return MARKET_PANEL[code] || '';
}
