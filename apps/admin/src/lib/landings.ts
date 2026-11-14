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

export const TEMPLATE_TONE: Record<string, string> = {
  full: '#0f6b4f',
  compact: '#16a06f',
  story: '#e1306c',
  flash: '#f5b301',
  problem: '#10b981',
  reviews: '#2563eb',
  premium: '#c9a227',
  kids: '#ff7a59',
  bundle: '#0f766e',
  minimal: '#7c3aed',
};

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

/** Landingda rasm telefon ekranidan kengroq chiqmaydi — retina uchun shu yetadi. */
const MAX_SIDE = 1440;
const WEBP_QUALITY = 0.8;
/** Shundan kichik va o'lchami me'yorda bo'lgan webp'ga tegilmaydi. */
const SMALL_ENOUGH = 250 * 1024;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Rasmni yuklashdan oldin brauzerning o'zida kichraytirib WebP'ga o'giradi.
 * Telefondan olingan 3–5 MB'li jpg/png odatda 100–250 KB bo'lib qoladi.
 * GIF (animatsiya bo'lishi mumkin), video va boshqa fayllar o'zgarmaydi.
 * Natija asl fayldan kattaroq chiqsa yoki biror narsa ishlamasa — asl fayl yuboriladi.
 */
export async function compressImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (file.type === 'image/webp' && scale === 1 && file.size <= SMALL_ENOUGH) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);

    let blob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY);
    // Eski Safari webp yozolmaydi — o'rniga png qaytaradi. Shaffof PNG'ni
    // jpeg'ga aylantirib bo'lmaydi (fon qorayadi), qolganlari jpeg bo'ladi.
    if (!blob || blob.type !== 'image/webp') {
      if (file.type === 'image/png') return file;
      blob = await canvasToBlob(canvas, 'image/jpeg', 0.82);
    }
    if (!blob || blob.size >= file.size) return file;

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
    return new File([blob], name, { type: blob.type });
  } finally {
    bmp.close();
  }
}

export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', await compressImage(file));
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || (res.status === 413 ? 'Fayl juda katta' : 'Fayl yuklanmadi'));
  return data.url as string;
}
