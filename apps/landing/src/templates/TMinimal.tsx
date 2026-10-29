import { useEffect, useRef, useState } from 'react';
import { accentVars, discount, FaqList, OrderForm, Reviews, Stars, usePageTheme } from '../blocks';
import type { TemplateProps } from '../shared';
import './t-minimal.css';

export default function TMinimal({ content: c, preview }: TemplateProps) {
  usePageTheme('#ffffff');
  const off = discount(c);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const imgs = c.images.length ? c.images : [''];

  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) setTimeout(() => document.querySelector<HTMLInputElement>('.mn-sheet input')?.focus(), 320);
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="tpl t-minimal" style={accentVars(c.accent, '#7c3aed')}>
      <div className="tpl-in">
        <header className="mn-bar">
          <b>{c.brand}</b>
          <span className="mn-dl">🚚 Yetkazib berish</span>
        </header>

        <section className="mn-gal">
          <div
            className="mn-track"
            ref={trackRef}
            onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          >
            {imgs.map((src, k) =>
              src ? (
                <img key={k} src={src} alt={c.title} loading={k ? 'lazy' : 'eager'} fetchPriority={k ? 'auto' : 'high'} />
              ) : (
                <div key={k} />
              ),
            )}
          </div>
          {imgs.length > 1 && (
            <span className="mn-count">
              {idx + 1}/{imgs.length}
            </span>
          )}
          {c.hitBadge ? <span className="mn-hit">{c.hitBadge}</span> : null}
        </section>

        {imgs.length > 1 && (
          <div className="mn-thumbs">
            {imgs.map((src, k) => (
              <button
                key={k}
                type="button"
                className={k === idx ? 'on' : ''}
                onClick={() => trackRef.current?.scrollTo({ left: k * trackRef.current.clientWidth, behavior: 'smooth' })}
              >
                {src ? <img src={src} alt="" loading="lazy" /> : null}
              </button>
            ))}
          </div>
        )}

        <section className="mn-info">
          <div className="mn-price">
            <b>
              {c.priceNew} <small>{c.currency}</small>
            </b>
            {c.priceOld ? <s>{c.priceOld}</s> : null}
            {off > 0 && <span className="mn-off">-{off}%</span>}
          </div>
          <h1>{c.title}</h1>
          {c.rating || c.reviewsCount ? (
            <div className="mn-rate">
              <Stars /> <b>{c.rating}</b> {c.reviewsCount ? <span>· {c.reviewsCount} ta baho</span> : null}
            </div>
          ) : null}
          {c.chips.length > 0 && (
            <div className="mn-specs">
              {c.chips.map((t, k) => (
                <span key={k}>{t}</span>
              ))}
            </div>
          )}
          <p className="mn-sub">{c.subtitle}</p>
        </section>

        <section className="mn-rows">
          <div>
            <span>🚚</span>
            <p>
              <b>Yetkazib berish</b>
              <small>1–3 kun ichida</small>
            </p>
          </div>
          <div>
            <span>💵</span>
            <p>
              <b>To‘lov</b>
              <small>Qo‘lga olganda — naqd yoki karta</small>
            </p>
          </div>
          {c.urgency ? (
            <div>
              <span>⚡</span>
              <p>
                <b>{c.timerLabel}</b>
                <small>{c.urgency}</small>
              </p>
            </div>
          ) : null}
        </section>

        {c.benefits.length > 0 && (
          <section className="mn-sec">
            <h2>{c.benefitsTitle}</h2>
            <ul className="mn-feats">
              {c.benefits.map((b, k) => (
                <li key={k}>
                  <span>{b.icon}</span>
                  <div>
                    <b>{b.title}</b>
                    <p>{b.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {c.reviews.length > 0 && (
          <section className="mn-sec">
            <h2>
              Sharhlar <small>{c.reviewsCount}</small>
            </h2>
            <Reviews items={c.reviews} />
          </section>
        )}

        {c.faq.length > 0 && (
          <section className="mn-sec">
            <h2>Savollar</h2>
            <FaqList items={c.faq} />
          </section>
        )}

        <footer className="b-foot">{c.footerText}</footer>
      </div>

      <div className="mn-buy">
        <div className="mn-buy-p">
          <b>
            {c.priceNew} {c.currency}
          </b>
          {c.priceOld ? <s>{c.priceOld}</s> : null}
        </div>
        <button type="button" onClick={() => setOpen(true)}>
          {c.ctaText}
        </button>
      </div>

      <div className={`mn-over ${open ? 'on' : ''}`} onClick={() => setOpen(false)} />
      <div className={`mn-sheet ${open ? 'on' : ''}`} role="dialog" aria-modal="true" aria-hidden={!open}>
        <div className="mn-grab" />
        <button type="button" className="mn-x" onClick={() => setOpen(false)} aria-label="Yopish">
          ✕
        </button>
        <div className="mn-sheet-p">
          {c.images[0] ? <img src={c.images[0]} alt="" /> : null}
          <div>
            <b>{c.title}</b>
            <span>
              {c.priceNew} {c.currency}
            </span>
          </div>
        </div>
        <h3>{c.formTitle}</h3>
        <p>{c.formSubtitle}</p>
        <OrderForm c={c} preview={preview} />
      </div>
    </div>
  );
}
