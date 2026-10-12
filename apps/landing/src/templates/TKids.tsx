import { accentVars, discount, FaqList, Gallery, OrderForm, Reviews, scrollToOrder, Stars, StickyCta, usePageTheme } from '../blocks';
import type { TemplateProps } from '../shared';
import './t-kids.css';

const TILE = ['#fff1c9', '#dcf5e7', '#e3ecff', '#ffe1ea', '#efe3ff', '#d9f4ff'];

function Wave({ fill }: { fill: string }) {
  return (
    <svg className="kd-wave" viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 15 Q 50 0 100 15 T 200 15 T 300 15 T 400 15 V30 H0Z" fill={fill} />
    </svg>
  );
}

export default function TKids({ content: c, preview }: TemplateProps) {
  usePageTheme('#fff8e7');
  const off = discount(c);

  return (
    <div className="tpl t-kids" style={accentVars(c.accent, '#ff7a59')}>
      <div className="tpl-in">
        <header className="kd-head">
          <span className="kd-logo">{c.brand}</span>
          {c.priceOld && off > 0 ? <span className="kd-sale">-{off}%</span> : null}
        </header>

        <section className="kd-hero">
          <span className="kd-cloud kd-c1" />
          <span className="kd-cloud kd-c2" />
          <div className="kd-blob">
            <Gallery images={c.images} alt={c.title} className="kd-gal" />
            {c.hitBadge ? <span className="kd-sticker">{c.hitBadge}</span> : null}
          </div>
          <h1>{c.title}</h1>
          <p>{c.subtitle}</p>
          {c.chips.length > 0 && (
            <div className="kd-chips">
              {c.chips.map((t, k) => (
                <span key={k} style={{ background: TILE[k % TILE.length] }}>
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="kd-pricebox">
            <div>
              {c.priceOld ? <s>{c.priceOld}</s> : null}
              <b>
                {c.priceNew} <small>{c.currency}</small>
              </b>
            </div>
            {c.rating || c.reviewsCount ? (
              <div className="kd-rate">
                <Stars />
                <small>{c.reviewsCount}</small>
              </div>
            ) : null}
          </div>
          <button type="button" className="kd-cta" onClick={scrollToOrder}>
            {c.ctaText}
          </button>
        </section>
      </div>

      {c.benefits.length > 0 && (
        <section className="kd-band">
          <Wave fill="#fff" />
          <div className="tpl-in kd-band-in">
            <h2 className="b-h2 kd-h2">{c.benefitsTitle}</h2>
            <div className="kd-bens">
              {c.benefits.map((b, k) => (
                <div className="kd-ben" key={k} style={{ background: TILE[k % TILE.length] }}>
                  <span>{b.icon}</span>
                  <b>{b.title}</b>
                  <p>{b.text}</p>
                </div>
              ))}
            </div>
          </div>
          <Wave fill="#fff8e7" />
        </section>
      )}

      <div className="tpl-in">
        {c.reviews.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2 kd-h2">Ota-onalar fikri</h2>
            <Reviews items={c.reviews} />
          </section>
        )}

        <section className="b-sec">
          <div className="kd-order">
            <span className="kd-order-ic">🎁</span>
            <h2 className="b-h2 kd-h2">{c.formTitle}</h2>
            <p>{c.urgency || c.formSubtitle}</p>
            <OrderForm c={c} preview={preview} />
          </div>
        </section>

        {c.faq.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2 kd-h2">Savollar</h2>
            <FaqList items={c.faq} />
          </section>
        )}

        <footer className="b-foot">{c.footerText}</footer>
      </div>

      <StickyCta label={c.ctaText} showAfter={620} />
    </div>
  );
}
