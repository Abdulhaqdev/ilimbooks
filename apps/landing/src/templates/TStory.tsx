import { useEffect, useState } from 'react';
import { accentVars, FaqList, OrderForm, Price, Reviews, scrollToOrder, Stars, StickyCta, usePageTheme } from '../blocks';
import type { TemplateProps } from '../shared';
import './t-story.css';

type Media = { type: 'video' | 'image'; src: string };

const IMAGE_MS = 4500;

export default function TStory({ content: c, preview }: TemplateProps) {
  usePageTheme('#0b0b0f');
  const media: Media[] = [
    ...(c.videoUrl ? [{ type: 'video' as const, src: c.videoUrl }] : []),
    ...c.images.map((src) => ({ type: 'image' as const, src })),
  ];
  const [i, setI] = useState(0);
  const cur = media[i] || media[0];

  useEffect(() => {
    if (media.length < 2 || cur?.type === 'video') return;
    const t = setTimeout(() => setI((x) => (x + 1) % media.length), IMAGE_MS);
    return () => clearTimeout(t);
  }, [i, media.length, cur?.type]);

  const next = () => setI((x) => (x + 1) % Math.max(1, media.length));
  const prev = () => setI((x) => (x - 1 + media.length) % Math.max(1, media.length));

  return (
    <div className={`tpl t-story ${c.accent ? 'has-ac' : ''}`} style={accentVars(c.accent, '#ff2e63')}>
      <section className="st-hero">
        <div className="st-media">
          {cur?.type === 'video' ? (
            <video key={cur.src} src={cur.src} poster={c.images[0]} autoPlay muted playsInline onEnded={next} />
          ) : cur ? (
            <img key={cur.src} src={cur.src} alt={c.title} fetchPriority="high" />
          ) : null}
        </div>
        <div className="st-shade" />

        <div className="st-top">
          <div className="st-bars">
            {media.map((m, k) => (
              <span key={k} className={k < i ? 'done' : k === i ? `on ${m.type}` : ''}>
                <i style={k === i && m.type === 'image' ? { animationDuration: `${IMAGE_MS}ms` } : undefined} />
              </span>
            ))}
          </div>
          <div className="st-user">
            <span className="st-av">{(c.brand || 'S').charAt(0).toUpperCase()}</span>
            <b>{c.brand}</b>
            <small>Homiylik</small>
            {c.hitBadge ? <em>{c.hitBadge}</em> : null}
          </div>
        </div>

        {media.length > 1 && (
          <>
            <button type="button" className="st-tap st-tap-l" onClick={prev} aria-label="Oldingi" />
            <button type="button" className="st-tap st-tap-r" onClick={next} aria-label="Keyingi" />
          </>
        )}

        <div className="st-bottom">
          {c.chips.length > 0 && (
            <div className="st-chips">
              {c.chips.map((t, k) => (
                <span key={k}>{t}</span>
              ))}
            </div>
          )}
          <h1>{c.title}</h1>
          <p>{c.subtitle}</p>
          <div className="st-row">
            <Price c={c} className="st-price" />
            {c.rating || c.reviewsCount ? (
              <span className="st-rate">
                <Stars /> {c.reviewsCount}
              </span>
            ) : null}
          </div>
          <button type="button" className="st-cta" onClick={scrollToOrder}>
            {c.ctaText}
          </button>
          <div className="st-more">Batafsil ↓</div>
        </div>
      </section>

      <div className="tpl-in">
        {c.benefits.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2">{c.benefitsTitle}</h2>
            <div className="st-bens">
              {c.benefits.map((b, k) => (
                <div className="st-ben" key={k}>
                  <span>{b.icon}</span>
                  <b>{b.title}</b>
                  <p>{b.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="b-sec">
          <div className="st-card">
            <div className="st-card-hd">
              <h2 className="b-h2">{c.formTitle}</h2>
              <p>{c.formSubtitle}</p>
              {c.stockLeft ? <div className="st-stock">🔥 Omborda {c.stockLeft} ta qoldi</div> : null}
            </div>
            <OrderForm c={c} preview={preview} />
          </div>
        </section>

        {c.reviews.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2">Mijozlar fikri</h2>
            <Reviews items={c.reviews} />
          </section>
        )}

        {c.faq.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2">Savollar</h2>
            <FaqList items={c.faq} />
          </section>
        )}

        <footer className="b-foot">{c.footerText}</footer>
      </div>

      <StickyCta label={c.ctaText} showAfter={500} sub={<b className="st-sticky-p">{c.priceNew} {c.currency}</b>} />
    </div>
  );
}
