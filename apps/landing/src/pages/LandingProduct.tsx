import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  discountPct,
  formatPhone,
  submitOrder,
  useCountdownToMidnight,
  type TemplateProps,
} from '../shared';

function useReveal(deps: unknown) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]:not(.in)'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }),
      { threshold: 0.12 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [deps]);
}

/** To'liq landing shabloni — galereya, narx, taymer, forma, afzalliklar. */
export default function LandingProduct({ content: c, preview }: TemplateProps) {
  const cd = useCountdownToMidnight();
  const slides = c.images.length ? c.images : ['/product/1.webp'];
  const [idx, setIdx] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [showBar, setShowBar] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  useReveal(c);

  const discount = useMemo(() => discountPct(c.priceOld, c.priceNew), [c.priceOld, c.priceNew]);

  useEffect(() => {
    if (idx >= slides.length) setIdx(0);
  }, [idx, slides.length]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!paused.current) setIdx((i) => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > 560 && !done);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, [done]);

  const go = (d: number) => { paused.current = true; setIdx((i) => (i + d + slides.length) % slides.length); };
  const scrollForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    const digits = phone.replace(/\D/g, '');
    if (name.trim().length < 2) return setErr('Ismingizni to‘liq yozing');
    if (digits.replace(/^998/, '').length !== 9) return setErr('Telefon raqamini to‘liq kiriting');
    setSending(true);
    const res = await submitOrder(name.trim(), phone, preview);
    setSending(false);
    if (res.ok) { setDone(true); setShowBar(false); }
    else setErr(res.message || 'Xatolik yuz berdi');
  }

  return (
    <div className="pg">
      {c.marquee ? (
        <div className="mq" aria-hidden>
          <div className="mq-t">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i}>{c.marquee}&nbsp;·&nbsp;</span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="wrap">
        <header className="hd">
          <div className="brand">📚 {c.brand}</div>
          <span className="hd-chip"><i /> Jonli</span>
        </header>

        <div className="gal" data-reveal>
          <div className="gal-main" onPointerDown={() => (paused.current = true)}>
            {discount > 0 && <span className="tag-off">-{discount}%</span>}
            {c.hitBadge ? <span className="tag-hit">{c.hitBadge}</span> : null}
            <div className="gal-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
              {slides.map((s, i) => (
                <img key={`${s}-${i}`} src={s} alt={`${c.title} ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} />
              ))}
            </div>
            {slides.length > 1 ? (
              <>
                <button className="nav prev" type="button" onClick={() => go(-1)} aria-label="Oldingi">‹</button>
                <button className="nav next" type="button" onClick={() => go(1)} aria-label="Keyingi">›</button>
                <div className="dots">
                  {slides.map((s, i) => (
                    <button key={`${s}-${i}`} type="button" className={i === idx ? 'dot on' : 'dot'} onClick={() => { paused.current = true; setIdx(i); }} aria-label={`Rasm ${i + 1}`} />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {c.chips.length ? (
          <div className="chips" data-reveal>
            {c.chips.map((chip, i) => <span className="chip" key={i}>{chip}</span>)}
          </div>
        ) : null}
        <h1 className="title" data-reveal>{c.title}</h1>
        <p className="subtitle" data-reveal>{c.subtitle}</p>
        {c.rating || c.reviewsCount ? (
          <div className="rating" data-reveal>
            <span className="stars">★★★★★</span>
            <span className="rev">{[c.rating, c.reviewsCount && `${c.reviewsCount} mamnun mijoz`].filter(Boolean).join(' · ')}</span>
          </div>
        ) : null}

        <div className="price" data-reveal>
          <div className="price-l">
            {c.priceOld ? <span className="price-old">{c.priceOld} {c.currency}</span> : null}
            <span className="price-new">{c.priceNew} <em>{c.currency}</em></span>
          </div>
          {discount > 0 && <div className="price-badge">-{discount}%<span>chegirma</span></div>}
        </div>

        <div className="timer-box" data-reveal>
          <div className="timer-label"><span className="dot-live" /> {c.timerLabel} tugashiga:</div>
          <div className="timer">
            {[[cd.h, 'SOAT'], [cd.m, 'MINUT'], [cd.sec, 'SONIYA']].map(([n, l], i) => (
              <div className="tcell" key={l}>
                <b key={n}>{n}</b>
                <span>{l}</span>
                {i < 2 && <i className="tsep">:</i>}
              </div>
            ))}
          </div>
          {c.urgency ? <p className="urgency">⏳ {c.urgency}</p> : null}
        </div>

        <div className="form-card" ref={formRef} data-reveal>
          {done ? (
            <div className="ok">
              <div className="ok-ic">✓</div>
              <h3>{c.successTitle}</h3>
              <p>{c.successText}</p>
            </div>
          ) : (
            <form className="form" onSubmit={onSubmit} noValidate>
              <h3 className="form-h">{c.formTitle}</h3>
              <p className="form-sub">{c.formSubtitle}</p>
              <div className="field">
                <input id="name" className="fi" placeholder=" " value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} />
                <label htmlFor="name">Ismingiz</label>
              </div>
              <div className="field">
                <input id="phone" className="fi" inputMode="tel" placeholder=" " value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  onFocus={() => !phone && setPhone('+998 (')} autoComplete="tel" />
                <label htmlFor="phone">Telefon raqamingiz</label>
              </div>
              {err && <div className="err">{err}</div>}
              <button className="cta" type="submit" disabled={sending}>
                {sending ? 'Yuborilmoqda…' : <>{c.ctaText} <span className="cta-ar">→</span></>}
              </button>
              {c.trust.length ? (
                <div className="trust">
                  {c.trust.map((t, i) => <span key={i}>{t}</span>)}
                </div>
              ) : null}
            </form>
          )}
        </div>

        {c.benefits.length ? (
          <section className="sec" data-reveal>
            <h2 className="sec-h">{c.benefitsTitle}</h2>
            <div className="bgrid">
              {c.benefits.map((b, i) => (
                <div className="bcell" key={i}>
                  <div className="bic">{b.icon}</div>
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {c.guaranteeTitle ? (
          <div className="guarantee" data-reveal>
            <div className="g-ic">🛡️</div>
            <div>
              <h3>{c.guaranteeTitle}</h3>
              <p>{c.guaranteeText}</p>
            </div>
          </div>
        ) : null}

        <footer className="foot">
          <div className="foot-brand">📚 {c.brand}</div>
          <p>{c.footerText}</p>
        </footer>
      </div>

      <div className={showBar ? 'sticky-cta show' : 'sticky-cta'}>
        <div className="sc-price">
          {c.priceOld ? <s>{c.priceOld}</s> : null}
          <b>{c.priceNew} {c.currency}</b>
        </div>
        <button className="cta" type="button" onClick={scrollForm}>{c.ctaText} →</button>
      </div>
    </div>
  );
}
