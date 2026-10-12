import { accentVars, discount, FaqList, Gallery, OrderForm, Price, Stars, StickyCta, usePageTheme } from '../blocks';
import type { TemplateProps } from '../shared';
import './t-reviews.css';

const AV = ['#f97316', '#10b981', '#6366f1', '#ec4899', '#0ea5e9', '#eab308'];

export default function TReviews({ content: c, preview }: TemplateProps) {
  usePageTheme('#f4f6fb', '#ffffff');
  const off = discount(c);

  return (
    <div className="tpl t-reviews" style={accentVars(c.accent, '#2563eb')}>
      <div className="tpl-in">
        <header className="rv-head">
          <b>{c.brand}</b>
          {c.hitBadge ? <span>{c.hitBadge}</span> : null}
        </header>

        <section className="rv-hero">
          <Gallery images={c.images} alt={c.title} className="rv-gal">
            {off > 0 && <span className="rv-off">-{off}%</span>}
          </Gallery>
          <h1>{c.title}</h1>
          <p>{c.subtitle}</p>

          <div className="rv-score">
            <div className="rv-big">
              <b>{c.rating}</b>
              <Stars />
            </div>
            <div className="rv-score-t">
              <b>{c.reviewsCount}</b> ta mijoz baholadi
            </div>
          </div>
          <Price c={c} className="rv-price" />
        </section>

        {c.reviews.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2">Mijozlar nima deydi?</h2>
            <div className="rv-list">
              {c.reviews.map((r, k) => (
                <article className="rv-it" key={k}>
                  <span className="rv-av" style={{ background: AV[k % AV.length] }}>
                    {(r.name || '?').charAt(0).toUpperCase()}
                  </span>
                  <div className="rv-body">
                    <div className="rv-bubble">
                      <div className="rv-who">
                        <b>{r.name}</b>
                        {r.city ? <small>· {r.city}</small> : null}
                      </div>
                      <Stars value={r.rating} />
                      <p>{r.text}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {c.benefits.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2">{c.benefitsTitle}</h2>
            <div className="rv-bens">
              {c.benefits.map((b, k) => (
                <div className="rv-ben" key={k}>
                  <span>{b.icon}</span>
                  <div>
                    <b>{b.title}</b>
                    <p>{b.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="b-sec">
          <div className="rv-order">
            <div className="rv-order-hd">
              <h2 className="b-h2">{c.formTitle}</h2>
              <p>{c.formSubtitle}</p>
            </div>
            <OrderForm c={c} preview={preview} head={c.urgency ? <div className="rv-urg">{c.urgency}</div> : null} />
          </div>
        </section>

        {c.faq.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2">Savollar</h2>
            <FaqList items={c.faq} />
          </section>
        )}

        <footer className="b-foot">{c.footerText}</footer>
      </div>

      <StickyCta
        label={c.ctaText}
        sub={
          <span className="rv-stk">
            <b>★ {c.rating}</b>
            <small>{c.reviewsCount}</small>
          </span>
        }
      />
    </div>
  );
}
