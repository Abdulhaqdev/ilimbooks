import { accentVars, FaqList, Gallery, OrderForm, scrollToOrder, Stars, StickyCta, usePageTheme } from '../blocks';
import type { TemplateProps } from '../shared';
import './t-premium.css';

export default function TPremium({ content: c, preview }: TemplateProps) {
  usePageTheme('#0a0f1f');

  return (
    <div className="tpl t-premium" style={accentVars(c.accent, '#d4af37', '#1a1406')}>
      <div className="tpl-in">
        <header className="pm-head">
          <i />
          <span>{c.brand}</span>
          <i />
        </header>

        <section className="pm-hero">
          {c.hitBadge ? <div className="pm-badge">{c.hitBadge}</div> : null}
          <div className="pm-arch">
            <Gallery images={c.images} alt={c.title} className="pm-gal" />
          </div>
          <h1>{c.title}</h1>
          <p>{c.subtitle}</p>
          {c.rating || c.reviewsCount ? (
            <div className="pm-rate">
              <Stars /> <span>{[c.rating, c.reviewsCount && `${c.reviewsCount} mamnun mijoz`].filter(Boolean).join(' · ')}</span>
            </div>
          ) : null}

          <div className="pm-price">
            <small>{c.timerLabel}</small>
            <div>
              {c.priceOld ? <s>{c.priceOld}</s> : null}
              <b>{c.priceNew}</b>
              <em>{c.currency}</em>
            </div>
          </div>
          <button type="button" className="pm-cta" onClick={scrollToOrder}>
            {c.ctaText}
          </button>
          {c.chips.length > 0 && (
            <div className="pm-chips">
              {c.chips.map((t, k) => (
                <span key={k}>{t}</span>
              ))}
            </div>
          )}
        </section>

        {c.benefits.length > 0 && (
          <section className="b-sec pm-sec">
            <h2 className="pm-h2">{c.benefitsTitle}</h2>
            <ol className="pm-bens">
              {c.benefits.map((b, k) => (
                <li key={k}>
                  <span>{String(k + 1).padStart(2, '0')}</span>
                  <div>
                    <b>{b.title}</b>
                    <p>{b.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {c.urgency ? (
          <section className="b-sec pm-sec">
            <div className="pm-gift">
              <span>🎁</span>
              <p>{c.urgency}</p>
            </div>
          </section>
        ) : null}

        {c.reviews.length > 0 && (
          <section className="b-sec pm-sec">
            <h2 className="pm-h2">Mijozlarimiz fikri</h2>
            <div className="pm-quotes">
              {c.reviews.map((r, k) => (
                <blockquote key={k}>
                  <p>{r.text}</p>
                  <footer>
                    — {r.name}
                    {r.city ? `, ${r.city}` : ''}
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        <section className="b-sec pm-sec">
          <div className="pm-order">
            <h2 className="pm-h2">{c.formTitle}</h2>
            <p className="pm-order-sub">{c.formSubtitle}</p>
            <OrderForm c={c} preview={preview} />
          </div>
        </section>

        {c.guaranteeText ? (
          <section className="b-sec pm-sec">
            <div className="pm-guar">
              <b>{c.guaranteeTitle}</b>
              <p>{c.guaranteeText}</p>
            </div>
          </section>
        ) : null}

        {c.faq.length > 0 && (
          <section className="b-sec pm-sec">
            <h2 className="pm-h2">Savollar</h2>
            <FaqList items={c.faq} />
          </section>
        )}

        <footer className="b-foot">{c.footerText}</footer>
      </div>

      <StickyCta label={c.ctaText} showAfter={640} />
    </div>
  );
}
