import { useMemo, useState, type FormEvent } from 'react';
import {
  discountPct,
  formatPhone,
  submitOrder,
  useCountdownToMidnight,
  type TemplateProps,
} from '../shared';

/** Bitta ekranga sig'adigan (scrollsiz) kompakt landing shabloni. */
export default function LandingCompact({ content: c, preview }: TemplateProps) {
  const cd = useCountdownToMidnight();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const discount = useMemo(() => discountPct(c.priceOld, c.priceNew), [c.priceOld, c.priceNew]);
  const img = c.images[0] || '/product/1.webp';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    const digits = phone.replace(/\D/g, '');
    if (name.trim().length < 2) return setErr('Ismingizni yozing');
    if (digits.replace(/^998/, '').length !== 9) return setErr('Raqamni to‘liq kiriting');
    setSending(true);
    const res = await submitOrder(name.trim(), phone, preview);
    setSending(false);
    if (res.ok) setDone(true);
    else setErr(res.message || 'Xatolik yuz berdi');
  }

  return (
    <div className="cpg">
      <div className="c-inner">
        <header className="c-hd">
          <div className="c-brand">📚 {c.brand}</div>
          <span className="c-timer">
            <i className="c-dot" />
            {cd.h}:{cd.m}:{cd.sec}
          </span>
        </header>

        {done ? (
          <div className="c-ok">
            <div className="c-ok-ic">✓</div>
            <h2>{c.successTitle}</h2>
            <p>{c.successText}</p>
          </div>
        ) : (
          <>
            <div className="c-hero">
              <div className="c-imgwrap">
                {discount > 0 && <span className="c-off">-{discount}%</span>}
                <img src={img} alt={c.title} />
              </div>
              <div className="c-meta">
                <h1 className="c-title">{c.title}</h1>
                <p className="c-sub">{c.subtitle}</p>
                {c.rating || c.reviewsCount ? (
                  <div className="c-stars">★★★★★ <span>{c.reviewsCount}</span></div>
                ) : null}
                <div className="c-price">
                  {c.priceOld ? <s>{c.priceOld}</s> : null}
                  <b>{c.priceNew}</b> <em>{c.currency}</em>
                </div>
              </div>
            </div>

            {c.urgency ? <div className="c-urg">⏳ {c.urgency}</div> : null}

            <form className="c-form" onSubmit={onSubmit} noValidate>
              <input className="c-fi" placeholder="Ismingiz" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} />
              <input className="c-fi" inputMode="tel" placeholder="+998 (__) ___-__-__" value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                onFocus={() => !phone && setPhone('+998 (')} autoComplete="tel" />
              {err && <div className="c-err">{err}</div>}
              <button className="c-cta" type="submit" disabled={sending}>
                {sending ? 'Yuborilmoqda…' : <>{c.ctaText} →</>}
              </button>
            </form>

            {c.trust.length ? (
              <div className="c-trust">
                {c.trust.map((t, i) => <span key={i}>{t}</span>)}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
