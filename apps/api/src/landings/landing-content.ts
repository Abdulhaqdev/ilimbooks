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

export const TEMPLATES = [
  'full',
  'compact',
  'story',
  'flash',
  'problem',
  'reviews',
  'premium',
  'kids',
  'bundle',
  'minimal',
] as const;
export type Template = (typeof TEMPLATES)[number];

export const DEFAULT_CONTENT: LandingContent = {
  brand: 'ilimbooks.uz',
  title: "SOYALI QUR'ON HUSNIXATI",
  subtitle: 'Yozib o‘rganish uchun eng qulay usul!',
  images: ['/product/1.webp', '/product/2.jpg', '/product/3.webp'],
  marquee: '✦ SOYALI QUR’ON HUSNIXATI · 🔥 AKSIYA · 🚚 YETKAZIB BERAMIZ',
  hitBadge: '🔥 HIT',
  chips: ['🌙 Original', '✅ Kafolatli', '💳 Qo‘lga olib to‘lash'],
  rating: '4.9',
  reviewsCount: '4 500+',
  priceOld: '279 000',
  priceNew: '169 000',
  currency: 'so‘m',
  timerLabel: 'Bugungi Aksiya',
  urgency: 'Mahsulot soni cheklangan — xarid qilishga ulgirib qoling!',
  formTitle: 'Buyurtma berish',
  formSubtitle: 'Ism va telefon raqamingizni qoldiring',
  ctaText: 'Buyurtma berish',
  trust: ['🔒 Xavfsiz', '💰 Qo‘lga olib to‘lash', '🚚 Tez yetkazish'],
  successTitle: 'Buyurtmangiz qabul qilindi!',
  successText: 'Tez orada operatorimiz siz bilan bog‘lanadi. Rahmat! 🌙',
  benefitsTitle: 'Nega aynan shu?',
  benefits: [
    { icon: '✍️', title: 'Mustaqil o‘rganish', text: 'Soyali matn ustidan yozib, husnixatni tez o‘zlashtirasiz.' },
    { icon: '📖', title: 'Sifatli nashr', text: 'Qalin, yorqin sahifalar va nafis muqova.' },
    { icon: '🎁', title: 'Hadya ichida', text: 'Qalam va xat cho‘pi to‘plam bilan birga.' },
    { icon: '🕌', title: 'Shaxsiy hifz', text: 'Qur’on bilan har kuni yaqinroq bog‘lanish.' },
  ],
  guaranteeTitle: 'Xavfsiz xarid',
  guaranteeText: 'To‘lovni mahsulotni qo‘lingizga olib, ko‘rganingizdan keyin qilasiz.',
  footerText: '© 2026 ilimbooks — foydali kitoblar.',
  seoTitle: "Soyali Qur'on Husnixati — Yozib o'rganish uchun eng qulay usul",
  seoDescription:
    "Soyali matn ustidan yozib husnixatni oson o'rganing. Aksiya narxida buyurtma bering.",
  reviews: [],
  faq: [],
  bundle: [],
  problemTitle: '',
  problems: [],
  stockLeft: '',
  videoUrl: '',
  accent: '',
};

const MEDIA_URL = /^(\/|https:\/\/)/;

const str = (v: unknown, fallback: string, max: number) =>
  typeof v === 'string' ? v.slice(0, max) : fallback;

const strList = (v: unknown, fallback: string[], maxItems: number, max: number) =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string').slice(0, maxItems).map((x) => x.slice(0, max))
    : fallback;

/** Kiruvchi JSON'ni xavfsiz LandingContent'ga aylantiradi (noma'lum maydonlar tashlanadi). */
export function sanitizeContent(raw: unknown, base: LandingContent = DEFAULT_CONTENT): LandingContent {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = {} as LandingContent;
  for (const key of Object.keys(DEFAULT_CONTENT) as (keyof LandingContent)[]) {
    const fallback = base[key];
    if (key === 'benefits') {
      out.benefits = Array.isArray(r.benefits)
        ? r.benefits.slice(0, 12).map((b) => {
            const o = (b && typeof b === 'object' ? b : {}) as Record<string, unknown>;
            return {
              icon: str(o.icon, '', 16),
              title: str(o.title, '', 120),
              text: str(o.text, '', 400),
            };
          })
        : base.benefits;
    } else if (key === 'reviews') {
      out.reviews = Array.isArray(r.reviews)
        ? r.reviews.slice(0, 12).map((v) => {
            const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
            const rating = Math.round(Number(o.rating));
            return {
              name: str(o.name, '', 60),
              city: str(o.city, '', 60),
              text: str(o.text, '', 500),
              rating: rating >= 1 && rating <= 5 ? rating : 5,
            };
          })
        : base.reviews;
    } else if (key === 'faq') {
      out.faq = Array.isArray(r.faq)
        ? r.faq.slice(0, 10).map((v) => {
            const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
            return { q: str(o.q, '', 200), a: str(o.a, '', 600) };
          })
        : base.faq;
    } else if (key === 'images') {
      out.images = strList(r.images, base.images, 12, 500).filter((u) => MEDIA_URL.test(u));
    } else if (key === 'videoUrl') {
      const v = str(r.videoUrl, base.videoUrl, 500).trim();
      out.videoUrl = !v || MEDIA_URL.test(v) ? v : '';
    } else if (key === 'accent') {
      const v = str(r.accent, base.accent, 7).trim();
      out.accent = /^#[0-9a-f]{6}$/i.test(v) ? v : '';
    } else if (key === 'chips' || key === 'trust') {
      out[key] = strList(r[key], fallback as string[], 8, 80);
    } else if (key === 'bundle' || key === 'problems') {
      out[key] = strList(r[key], fallback as string[], 10, 160);
    } else {
      const max = key === 'seoDescription' || key === 'successText' || key === 'guaranteeText' ? 400 : 200;
      (out as Record<string, unknown>)[key] = str(r[key], fallback as string, max);
    }
  }
  return out;
}

/** URL qismi: kichik harf, raqam va "-" (bo'sh — bosh sahifa). */
export function normSlug(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function slugToPath(slug: string): string {
  return slug ? `/${slug}` : '/';
}

export function pathToSlug(path: string): string {
  return normSlug((path || '/').split('?')[0]);
}
