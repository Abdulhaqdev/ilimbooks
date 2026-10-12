import { accentVars, Clock, FaqList, OrderForm, Reviews, savings, scrollToOrder, Stars, StickyCta, usePageTheme } from '../blocks';
import type { TemplateProps } from '../shared';
import './t-bundle.css';

export default function TBundle({ content: c, preview }: TemplateProps) {
  usePageTheme('#f3f7f6', '#ffffff');
  const save = savings(c);
  const [main, ...rest] = c.images;

  return (
    <div className="tpl t-bundle" style={accentVars(c.accent, '#0f766e')}>
      <div className="tpl-in">
        <header className="bd-head">
          <b>{c.brand}</b>
          {c.rating ? (
            <span>
              <Stars /> {c.rating}
            </span>
          ) : null}
        </header>

        <section className="bd-hero">
          <div className={`bd-collage n${Math.min(3, c.images.length)}`}>
            {main ? <img src={main} alt={c.title} fetchPriority="high" className="bd-main" /> : null}
            {rest.slice(0, 2).map((src, k) => (
              <img key={k} src={src} alt="" loading="lazy" />
            ))}
            {c.hitBadge ? <span className="bd-ribbon">{c.hitBadge}</span> : null}
          </div>
          <div className="bd-kicker">TO‘PLAM</div>
          <h1>{c.title}</h1>
          <p>{c.subtitle}</p>
        </section>

        {c.bundle.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2">To‘plam ichida:</h2>
            <div className="bd-items">
              {c.bundle.map((t, k) => (
                <div className="bd-item" key={k}>
                  {c.images[k] ? <img src={c.images[k]} alt="" loading="lazy" /> : <span className="bd-num">{k + 1}</span>}
                  <p>{t}</p>
                  <i>✓</i>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="b-sec">
          <div className="bd-calc">
            {c.priceOld ? (
              <div className="bd-row">
                <span>Alohida olsangiz</span>
                <s>
                  {c.priceOld} {c.currency}
                </s>
              </div>
            ) : null}
            <div className="bd-row bd-total">
              <span>To‘plam narxi</span>
              <b>
                {c.priceNew} {c.currency}
              </b>
            </div>
            {save ? (
              <div className="bd-save">
                💰 Siz <b>{save} {c.currency}</b> tejaysiz
              </div>
            ) : null}
            <div className="bd-timer">
              <small>{c.timerLabel}</small>
              <Clock />
            </div>
            <button type="button" className="bd-cta" onClick={scrollToOrder}>
              {c.ctaText}
            </button>
          </div>
        </section>

        {c.benefits.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2">{c.benefitsTitle}</h2>
            <div className="bd-bens">
              {c.benefits.map((b, k) => (
                <div className="bd-ben" key={k}>
                  <span>{b.icon}</span>
                  <b>{b.title}</b>
                  <p>{b.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {c.reviews.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2">Xaridorlar fikri</h2>
            <Reviews items={c.reviews} />
          </section>
        )}

        <section className="b-sec">
          <div className="bd-order">
            <h2 className="b-h2">{c.formTitle}</h2>
            <p>{c.urgency || c.formSubtitle}</p>
            <OrderForm c={c} preview={preview} />
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
        sub={save ? <span className="bd-stk">-{save}</span> : undefined}
        showAfter={560}
      />
    </div>
  );
}
