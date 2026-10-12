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

/** Market paneli — admin oqim (stream) kalitini shu yerdan oladi. */
export const MARKET_PANEL: Record<string, string> = {
  shoxmarket: 'https://admin.shoxmarket.uz',
  amiram: 'https://admin.amiram.uz',
};

export function marketPanel(code: string) {
  return MARKET_PANEL[code] || '';
}
