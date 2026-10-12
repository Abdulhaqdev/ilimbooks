import { LANDING_URL } from './api';

export type Benefit = { icon: string; title: string; text: string };
export type Review = { name: string; city: string; text: string; rating: number };
export type Faq = { q: string; a: string };

export type LandingContent = {
  brand: string;
  title: string;
  subtitle: string;
  images: string[];
  marquee: string;
  hitBadge: string;
  chips: string[];
  rating: string;
  reviewsCount: string;
  priceOld: string;
  priceNew: string;
  currency: string;
  timerLabel: string;
  urgency: string;
  formTitle: string;
  formSubtitle: string;
  ctaText: string;
  trust: string[];
  successTitle: string;
  successText: string;
  benefitsTitle: string;
  benefits: Benefit[];
  guaranteeTitle: string;
  guaranteeText: string;
  footerText: string;
  seoTitle: string;
  seoDescription: string;
  reviews: Review[];
  faq: Faq[];
  bundle: string[];
  problemTitle: string;
  problems: string[];
  stockLeft: string;
  videoUrl: string;
  accent: string;
};

export type Template =
  | 'full'
  | 'compact'
  | 'story'
  | 'flash'
  | 'problem'
  | 'reviews'
  | 'premium'
  | 'kids'
  | 'bundle'
  | 'minimal';

/** Shablon qaysi bloklarni ko'rsatadi — tahrirlagich faqat keraklilarini chiqaradi. */
export type Feature =
  | 'marquee'
  | 'hitBadge'
  | 'chips'
  | 'guarantee'
  | 'benefits'
  | 'reviews'
  | 'faq'
  | 'bundle'
  | 'problems'
  | 'stock'
  | 'video'
  | 'formText'
  | 'footer'
  | 'accent';

export type Preset = {
  id: string;
  name: string;
  goal: string;
  product: string;
  category: string;
  source: string;
  /** Qaysi market katalogidan (Market.code) */
  marketCode?: string;
  sourceUrl: string;
  template: Template;
  tags: string[];
  offerId?: string;
  /** Market lead uchun to'laydigan summa (so'm) */
  payout?: string;
  content: LandingContent;
};

export type Landing = {
  id: string;
  slug: string;
  path: string;
  name: string;
  template: Template;
  active: boolean;
  content: LandingContent;
  pixelId: string;
  account: string;
  marketId: string | null;
  /** Market oqimi (stream kaliti) — bo'sh bo'lsa market standarti */
  stream: string;
  /** Market mahsulot raqami (offer_id) */
  offerId: string;
  updatedAt: string;
  /** Ro'yxatda keladigan qo'shimcha maydonlar */
  marketName?: string;
  marketCode?: string;
  /** api_key + oqim + offer to'liq — lead marketga uzatiladi */
  ready?: boolean;
  /** Nima yetishmaydi: ['api_key','oqim','offer_id'] */
  missing?: string[];
  stats7d?: { clicks: number; leads: number };
};

const COMMON: Feature[] = ['hitBadge', 'benefits', 'reviews', 'faq', 'formText', 'footer', 'accent'];

export const TEMPLATES: { id: Template; label: string; hint: string; features: Feature[] }[] = [
  {
    id: 'full',
    label: 'Klassik',
    hint: 'Galereya, taymer, afzalliklar, kafolat',
    features: ['marquee', 'hitBadge', 'chips', 'guarantee', 'benefits', 'formText', 'footer'],
  },
  { id: 'compact', label: 'Kompakt', hint: 'Bitta ekran — rasm, narx va forma', features: [] },
  { id: 'story', label: 'Story / Reels', hint: 'To‘liq ekranli video, Instagram uslubi', features: [...COMMON, 'chips', 'stock', 'video'] },
  { id: 'flash', label: 'Mega aksiya', hint: 'Katta taymer, qoldiq, shoshilinchlik', features: [...COMMON.filter((f) => f !== 'hitBadge' && f !== 'formText'), 'marquee', 'bundle', 'stock'] },
  { id: 'problem', label: 'Muammo → Yechim', hint: 'Og‘riq nuqtasidan boshlanadi', features: [...COMMON, 'chips', 'problems', 'guarantee'] },
  { id: 'reviews', label: 'Sharhlar', hint: 'Ijtimoiy isbot birinchi o‘rinda', features: COMMON },
  { id: 'premium', label: 'Premium', hint: 'Nafis, qimmat ko‘rinish, sovg‘alar', features: [...COMMON, 'chips', 'guarantee'] },
  { id: 'kids', label: 'Bolalar', hint: 'Yorqin, quvnoq — ota-onalar uchun', features: [...COMMON, 'chips'] },
  { id: 'bundle', label: 'To‘plam', hint: 'Tarkib va tejash hisobi', features: [...COMMON, 'bundle'] },
  { id: 'minimal', label: 'Minimal do‘kon', hint: 'Marketplace uslubi, pastdan forma', features: [...COMMON, 'chips'] },
];

export function templateLabel(t: string) {
  return TEMPLATES.find((x) => x.id === t)?.label || t;
}

export function hasFeature(t: string, f: Feature) {
  return !!TEMPLATES.find((x) => x.id === t)?.features.includes(f);
}

const base = () => LANDING_URL.replace(/\/$/, '');

/** Landingning jonli manzili. */
export function landingUrl(path: string) {
  return path === '/' ? `${base()}/` : `${base()}${path}`;
}

/** Landing public/ ichidagi rasmlar (/product/..) admin domenida yo'q — landing domenidan olinadi. */
export function imgSrc(url: string) {
  if (/^https?:\/\//.test(url) || url.startsWith('/api/')) return url;
  return `${base()}${url}`;
}

/** Slug kiritishni server qoidasi bilan bir xil normallashtiradi. */
export function normSlug(raw: string) {
  return raw
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || (res.status === 413 ? 'Fayl juda katta' : 'Fayl yuklanmadi'));
  return data.url as string;
}
