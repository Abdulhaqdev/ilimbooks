import { currentAccount, normalizePath } from './account';
import { getMetaCookies } from './capi';
import { trackMetaCta } from './pixel';

type TrackEvent = {
  type: string;
  elId?: string;
  elText?: string;
  scrollPct?: number;
  dwellMs?: number;
};

const ENDPOINT = '/api/e';
let queue: TrackEvent[] = [];
let sid = '';
let started = 0;
let count = 0;
let flushed = false;
let variant = '';
let perLoad = false;

function clip(v: string, n: number) {
  return v.slice(0, n);
}

/**
 * Rotatsiya sahifasida ko'rsatilgan landing. `perLoad` — har ochilishda variant almashadi,
 * shuning uchun har ochilish alohida sessiya hisoblanadi.
 */
export function setVariant(v?: string, perLoadSession = false) {
  variant = v ? clip(v, 64) : '';
  perLoad = !!variant && perLoadSession;
}

export function getSid() {
  if (sid) return sid;
  if (perLoad) {
    sid = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    return sid;
  }
  try {
    const existing = sessionStorage.getItem('sp_sid');
    if (existing) {
      sid = existing;
      return sid;
    }
    sid = crypto.randomUUID();
    sessionStorage.setItem('sp_sid', sid);
  } catch {
    sid = sid || Math.random().toString(36).slice(2);
  }
  return sid;
}

export function getMeta(extra: { eventId?: string } = {}) {
  return meta(extra);
}

function meta(extra: { eventId?: string } = {}) {
  const p = new URLSearchParams(location.search);
  const { fbp, fbc } = getMetaCookies();
  const fbclid = p.get('fbclid')?.slice(0, 512) || undefined;
  return {
    utmSource: p.get('utm_source')?.slice(0, 60) || undefined,
    utmMedium: p.get('utm_medium')?.slice(0, 60) || undefined,
    utmCampaign: p.get('utm_campaign')?.slice(0, 80) || undefined,
    utmContent: p.get('utm_content')?.slice(0, 80) || undefined,
    utmTerm: p.get('utm_term')?.slice(0, 80) || undefined,
    referrer: document.referrer?.slice(0, 300) || undefined,
    ua: navigator.userAgent.slice(0, 512),
    page: normalizePath(location.pathname),
    pageUrl: location.href.split('#')[0].slice(0, 1000),
    account: currentAccount(),
    variant: variant || undefined,
    fbclid,
    fbp: fbp?.slice(0, 255) || undefined,
    fbc: (fbc || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : '')).slice(0, 512) || undefined,
    eventId: extra.eventId?.slice(0, 64) || undefined,
  };
}

function flush() {
  if (!queue.length) return;
  const events = queue;
  queue = [];
  const body = JSON.stringify({ sid: getSid(), events, meta: meta() });
  try {
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain' }))) {
      return;
    }
  } catch {
    /* fallthrough */
  }
  fetch(ENDPOINT, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'text/plain' },
    keepalive: true,
  }).catch(() => {});
}

export function track(ev: TrackEvent) {
  if (count >= 200) return;
  count++;
  queue.push(ev);
  if (ev.type === 'cta' || queue.length >= 15) flush();
}

export function enrichTelegramLinks() {
  const p = new URLSearchParams(location.search);
  const src = p.get('utm_source') || (/instagram/i.test(document.referrer) ? 'ig' : '');
  const cr = p.get('utm_content') || p.get('utm_campaign') || '';
  const clean = (v: string) => v.replace(/[^a-zA-Z0-9_-]/g, '');

  document.querySelectorAll<HTMLAnchorElement>('a[data-tg]').forEach((a) => {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    try {
      const u = new URL(a.href);
      const base = u.searchParams.get('start') || 'web';
      const dup = clean(cr).toLowerCase() === clean(base).toLowerCase();
      const tag = [src, dup ? '' : cr]
        .filter(Boolean)
        .map(clean)
        .filter(Boolean)
        .join('-')
        .slice(0, 40);
      if (!tag) return;
      const next = `${base}-${tag}`.slice(0, 64);
      if (base === next || base.slice(-(tag.length + 1)) === `-${tag}`) return;
      u.searchParams.set('start', next);
      a.href = u.toString();
    } catch {
      /* ignore */
    }
  });
}

/** Telegram CTA: analitika + Meta event, brauzer darhol yangi tabda ochadi */
function bindTgCtaClicks() {
  addEventListener(
    'click',
    (e) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[data-tg]') as
        | HTMLAnchorElement
        | null;
      if (!a?.href) return;

      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const cta = clip(a.dataset.tId || a.dataset.fbCta || 'cta', 60);
      const label = clip((a.textContent || '').trim().replace(/\s+/g, ' '), 80);

      // Admin analitikasi
      track({ type: 'cta', elId: cta, elText: label });
      flush();

      // Meta: faqat data-fb-event berilgan bo‘lsa (default Lead emas — buyurtmasiz Lead shishmasin)
      const fbEvent = a.dataset.fbEvent?.trim();
      if (fbEvent) trackMetaCta(fbEvent, cta);
    },
    { capture: true },
  );
}

export function initTracking() {
  try {
    if (localStorage.getItem('sp_optout') === '1') return;
  } catch {
    /* ignore */
  }
  if (flushed) return;
  flushed = true;
  started = Date.now();
  getSid();
  track({ type: 'pageview' });
  enrichTelegramLinks();
  bindTgCtaClicks();

  const seen = new Set<number>();
  let raf = 0;
  addEventListener(
    'scroll',
    () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = document.documentElement.scrollHeight - innerHeight;
        if (max <= 0) return;
        const pct = Math.round((scrollY / max) * 100);
        for (const p of [25, 50, 75, 100]) {
          if (pct >= p && !seen.has(p)) {
            seen.add(p);
            track({ type: 'scroll', scrollPct: p });
          }
        }
      });
    },
    { passive: true },
  );

  let exited = false;
  const onExit = () => {
    if (exited) return;
    exited = true;
    track({ type: 'exit', dwellMs: Date.now() - started });
    flush();
  };
  addEventListener('pagehide', onExit);
  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onExit();
  });

  setInterval(flush, 8000);
}
