import { useEffect, useState } from 'react';
import { normalizePath } from './account';
import { initPixel, trackMetaCta } from './pixel';
import { getMeta, getSid, initTracking, track } from './track';

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

export type LandingData = {
  path: string;
  template: string;
  content: LandingContent;
  pixelId: string;
};

export type TemplateProps = { content: LandingContent; preview: boolean };

export const IS_PREVIEW = new URLSearchParams(location.search).get('preview') === '1';
if (IS_PREVIEW) document.documentElement.classList.add('ib-preview');

/** Preview ma'lumotini faqat admin panel domenidan qabul qilamiz. */
const ADMIN_ORIGINS = new Set(
  [import.meta.env.VITE_ADMIN_URL || 'https://admin.ilimbooks.uz', 'http://localhost:5174'].map(
    (u) => u.replace(/\/$/, ''),
  ),
);

export type OrderResult = { ok: boolean; message?: string };

/** Buyurtmani backendga yuboradi (backend ShoxMarket API'ga uzatadi). */
export async function submitOrder(name: string, phone: string, preview = false): Promise<OrderResult> {
  if (preview) return { ok: true };
  try {
    const res = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, sid: getSid(), meta: getMeta() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok) {
      track({ type: 'cta', elId: 'order', elText: 'Buyurtma berish' });
      trackMetaCta('Lead', 'order');
      return { ok: true };
    }
    return { ok: false, message: data?.message || 'Xatolik yuz berdi' };
  } catch {
    return { ok: false, message: 'Tarmoq xatosi. Qayta urinib ko‘ring' };
  }
}

export function discountPct(oldPrice: string, newPrice: string) {
  const o = Number(oldPrice.replace(/\D/g, ''));
  const n = Number(newPrice.replace(/\D/g, ''));
  if (!o || !n || n >= o) return 0;
  return Math.round(((o - n) / o) * 100);
}

export function formatPhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  d = d.slice(0, 9);
  let out = '+998';
  if (d.length > 0) out += ' (' + d.slice(0, 2);
  if (d.length >= 2) out += ') ' + d.slice(2, 5);
  if (d.length >= 5) out += '-' + d.slice(5, 7);
  if (d.length >= 7) out += '-' + d.slice(7, 9);
  return out;
}

export function useCountdownToMidnight() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const left = Math.max(0, end.getTime() - now);
  const s = Math.floor(left / 1000);
  return {
    d: String(Math.floor(s / 86400)).padStart(2, '0'),
    h: String(Math.floor((s % 86400) / 3600)).padStart(2, '0'),
    m: String(Math.floor((s % 3600) / 60)).padStart(2, '0'),
    sec: String(s % 60).padStart(2, '0'),
  };
}

function applySeo(c: LandingContent) {
  if (c.seoTitle) document.title = c.seoTitle;
  const desc = document.querySelector('meta[name="description"]');
  if (desc && c.seoDescription) desc.setAttribute('content', c.seoDescription);
}

type State =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; landing: LandingData };

/** Joriy URL uchun landingni API'dan (yoki admin preview'dan) oladi. */
export function useLanding(pathname: string): State {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    if (!IS_PREVIEW) return;
    const onMessage = (e: MessageEvent) => {
      if (!ADMIN_ORIGINS.has(e.origin)) return;
      const d = e.data as { type?: string; landing?: LandingData };
      if (d?.type !== 'ib-preview' || !d.landing?.content) return;
      setState({ status: 'ready', landing: d.landing });
    };
    addEventListener('message', onMessage);
    window.parent?.postMessage({ type: 'ib-preview-ready' }, '*');
    return () => removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (IS_PREVIEW) return;
    let cancelled = false;
    setState({ status: 'loading' });
    fetch(`/api/public/landing?path=${encodeURIComponent(normalizePath(pathname))}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: LandingData | null) => {
        if (cancelled) return;
        if (!d?.content) return setState({ status: 'missing' });
        setState({ status: 'ready', landing: d });
        applySeo(d.content);
        initTracking();
        initPixel(d.pixelId);
      })
      .catch(() => !cancelled && setState({ status: 'missing' }));
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return state;
}
