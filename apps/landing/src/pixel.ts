/** Meta Pixel — tugma bosilganda standart event (Event Setup Tool o‘rniga, kod bilan) */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const inited = new Set<string>();

/** Pixel’ni bir marta init qiladi + PageView (takror chaqirilsa e'tiborsiz). */
export function initPixel(rawId: string) {
  const id = String(rawId || '').split(',')[0].trim();
  if (!/^\d{5,20}$/.test(id) || inited.has(id)) return;
  if (typeof window.fbq !== 'function') return;
  inited.add(id);
  try {
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  } catch {
    /* ignore */
  }
}

/** Meta standart eventlari — noto‘g‘ri nom yuborilmasligi uchun */
const STANDARD_EVENTS = new Set([
  'Lead',
  'SubmitApplication',
  'Contact',
  'CompleteRegistration',
  'Subscribe',
  'StartTrial',
  'Schedule',
  'ViewContent',
]);

/**
 * CTA bosilganda darhol yuboriladi.
 * Havolalar target="_blank" bo‘lgani uchun landing sahifasi yopilmaydi —
 * so‘rov uzilmaydi, shuning uchun kutish yoki eventCallback kerak emas.
 */
export function trackMetaCta(eventName: string, ctaId: string) {
  if (typeof window.fbq !== 'function') return;
  const event = STANDARD_EVENTS.has(eventName) ? eventName : 'Lead';
  try {
    window.fbq('track', event, { content_name: ctaId, content_category: 'cta' });
  } catch {
    /* ignore */
  }
}

/** SPA route o‘zgarishida PageView (index.html faqat birinchi yuklanishda) */
export function trackMetaPageView() {
  if (typeof window.fbq !== 'function') return;
  try {
    window.fbq('track', 'PageView');
  } catch {
    /* ignore */
  }
}
