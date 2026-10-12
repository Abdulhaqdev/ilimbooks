import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import './blocks.css';
import { formatPhone, submitOrder, type Faq, type LandingContent, type Review } from './shared';

export const ORDER_ID = 'order';

export function scrollToOrder() {
  const el = document.getElementById(ORDER_ID);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => el.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }), 450);
}

/** Sahifa foni va brauzer paneli rangi (Instagram in-app brauzer ham shu rangni oladi). */
export function usePageTheme(bg: string, bar = bg) {
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    const prevBar = meta?.getAttribute('content');
    meta?.setAttribute('content', bar);
    return () => {
      document.body.style.background = prev;
      if (prevBar) meta?.setAttribute('content', prevBar);
    };
  }, [bg, bar]);
}

const toNum = (s: string) => Number(String(s || '').replace(/\D/g, '')) || 0;

export function savings(c: LandingContent) {
  const d = toNum(c.priceOld) - toNum(c.priceNew);
  return d > 0 ? d.toLocaleString('ru-RU').replace(/,/g, ' ') : '';
}

export function discount(c: LandingContent) {
  const o = toNum(c.priceOld);
  const n = toNum(c.priceNew);
  return o && n && n < o ? Math.round(((o - n) / o) * 100) : 0;
}

export function accentVars(accent: string, fallback: string, ink = '#fff'): CSSProperties {
  return { '--ac': accent || fallback, '--ac-ink': ink } as CSSProperties;
}

export function Stars({ value = 5, className = '' }: { value?: number; className?: string }) {
  return (
    <span className={`b-stars ${className}`} aria-label={`${value} yulduz`}>
      {'★★★★★'.slice(0, value)}
      <i>{'★★★★★'.slice(value)}</i>
    </span>
  );
}

export function Price({ c, className = '' }: { c: LandingContent; className?: string }) {
  return (
    <div className={`b-price ${className}`}>
      <b>
        {c.priceNew} <small>{c.currency}</small>
      </b>
      {c.priceOld ? <s>{c.priceOld} {c.currency}</s> : null}
    </div>
  );
}

export function Gallery({
  images,
  alt,
  className = '',
  children,
}: {
  images: string[];
  alt: string;
  className?: string;
  children?: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const list = images.length ? images : [''];

  const onScroll = () => {
    const el = trackRef.current;
    if (el) setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };
  const go = (i: number) => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className={`b-gal ${className}`}>
      <div className="b-gal-track" ref={trackRef} onScroll={onScroll}>
        {list.map((src, i) => (
          <div className="b-gal-slide" key={i}>
            {src ? (
              <img
                src={src}
                alt={alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
                decoding="async"
              />
            ) : null}
          </div>
        ))}
      </div>
      {children}
      {list.length > 1 && (
        <div className="b-gal-dots">
          {list.map((_, i) => (
            <button key={i} type="button" className={i === idx ? 'on' : ''} onClick={() => go(i)} aria-label={`${i + 1}-rasm`} />
          ))}
        </div>
      )}
    </div>
  );
}

export function useOrderForm(preview: boolean) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (name.trim().length < 2) return setErr('Ismingizni yozing');
    if (phone.replace(/\D/g, '').replace(/^998/, '').length !== 9) return setErr('Telefon raqamni to‘liq kiriting');
    setSending(true);
    const res = await submitOrder(name.trim(), phone, preview);
    setSending(false);
    if (res.ok) setDone(true);
    else setErr(res.message || 'Xatolik yuz berdi');
  }

  return { name, setName, phone, setPhone, sending, done, err, submit };
}

export function OrderForm({
  c,
  preview,
  className = '',
  head,
  showTrust = true,
}: {
  c: LandingContent;
  preview: boolean;
  className?: string;
  head?: ReactNode;
  showTrust?: boolean;
}) {
  const f = useOrderForm(preview);

  if (f.done) {
    return (
      <div className={`of of-done ${className}`} id={ORDER_ID}>
        <div className="of-ok-ic">✓</div>
        <h3>{c.successTitle}</h3>
        <p>{c.successText}</p>
      </div>
    );
  }

  return (
    <form className={`of ${className}`} id={ORDER_ID} onSubmit={f.submit} noValidate>
      {head}
      <input
        className="of-in"
        placeholder="Ismingiz"
        value={f.name}
        onChange={(e) => f.setName(e.target.value)}
        autoComplete="name"
        maxLength={60}
        aria-label="Ismingiz"
      />
      <input
        className="of-in"
        inputMode="tel"
        type="tel"
        placeholder="+998 (__) ___-__-__"
        value={f.phone}
        onChange={(e) => f.setPhone(formatPhone(e.target.value))}
        onFocus={() => !f.phone && f.setPhone('+998 (')}
        autoComplete="tel"
        aria-label="Telefon raqam"
      />
      {f.err && <div className="of-err">{f.err}</div>}
      <button className="of-btn" type="submit" disabled={f.sending}>
        {f.sending ? 'Yuborilmoqda…' : c.ctaText}
      </button>
      {showTrust && c.trust.length > 0 && (
        <div className="of-trust">
          {c.trust.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      )}
    </form>
  );
}

/** Forma ko'rinmay qolganda pastda doim turadigan tugma. */
export function StickyCta({
  label,
  sub,
  className = '',
  showAfter = 360,
  onClick = scrollToOrder,
}: {
  label: string;
  sub?: ReactNode;
  className?: string;
  showAfter?: number;
  onClick?: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > showAfter);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, [showAfter]);

  useEffect(() => {
    const el = document.getElementById(ORDER_ID);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setFormVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  });

  const show = scrolled && !formVisible;
  return (
    <div className={`b-sticky ${show ? 'on' : ''} ${className}`} aria-hidden={!show}>
      {sub ? <div className="b-sticky-sub">{sub}</div> : null}
      <button type="button" className="b-sticky-btn" onClick={onClick} tabIndex={show ? 0 : -1}>
        {label}
      </button>
    </div>
  );
}

const AVATAR_BG = ['#f97316', '#10b981', '#6366f1', '#ec4899', '#0ea5e9', '#eab308', '#8b5cf6'];

export function Reviews({ items, className = '' }: { items: Review[]; className?: string }) {
  if (!items?.length) return null;
  return (
    <div className={`b-revs ${className}`}>
      {items.map((r, i) => (
        <div className="b-rev" key={i}>
          <div className="b-rev-hd">
            <span className="b-rev-av" style={{ background: AVATAR_BG[i % AVATAR_BG.length] }}>
              {(r.name || '?').charAt(0).toUpperCase()}
            </span>
            <div className="b-rev-who">
              <b>{r.name}</b>
              {r.city ? <small>{r.city}</small> : null}
            </div>
            <Stars value={r.rating} />
          </div>
          <p>{r.text}</p>
        </div>
      ))}
    </div>
  );
}

export function FaqList({ items, className = '' }: { items: Faq[]; className?: string }) {
  if (!items?.length) return null;
  return (
    <div className={`b-faq ${className}`}>
      {items.map((f, i) => (
        <details key={i} className="b-faq-it">
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function Clock({ className = '' }: { className?: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((end.getTime() - now) / 1000));
  const parts = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0'));
  const labels = ['soat', 'daqiqa', 'soniya'];
  return (
    <div className={`b-clock ${className}`}>
      {parts.map((p, i) => (
        <span key={i} className="b-clock-u">
          <b>{p}</b>
          <small>{labels[i]}</small>
        </span>
      ))}
    </div>
  );
}
