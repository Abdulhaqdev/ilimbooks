import {
  accentVars,
  Clock,
  discount,
  FaqList,
  Gallery,
  OrderForm,
  Reviews,
  savings,
  StickyCta,
  usePageTheme,
} from '../blocks';
import type { TemplateProps } from '../shared';
import './t-flash.css';

export default function TFlash({ content: c, preview }: TemplateProps) {
  usePageTheme('#0a0a0a');
  const off = discount(c);
  const save = savings(c);
  const stock = Number(c.stockLeft) || 0;
  const stockPct = stock ? Math.max(6, Math.min(100, stock * 2)) : 0;

  return (
    <div className="tpl t-flash" style={accentVars(c.accent, '#ffd400', '#111')}>
      {c.marquee ? (
        <div className="fl-marq">
          <div>
            <span>{c.marquee}</span>
            <span aria-hidden="true">{c.marquee}</span>
          </div>
        </div>
      ) : null}

      <div className="tpl-in">
        <header className="fl-head">
          <span className="fl-brand">{c.brand}</span>
          <span className="fl-live">
            <i /> AKSIYA DAVOM ETMOQDA
          </span>
        </header>

        <section className="fl-hero">
          <h1>{c.title}</h1>
          <p>{c.subtitle}</p>
          <Gallery images={c.images} alt={c.title} className="fl-gal">
            {off > 0 && (
              <span className="fl-burst">
                <b>-{off}%</b>
              </span>
            )}
          </Gallery>
        </section>

        <section className="fl-deal">
          <div className="fl-prices">
            {c.priceOld ? (
              <div className="fl-old">
                <small>Oddiy narx</small>
                <s>
                  {c.priceOld} {c.currency}
                </s>
              </div>
            ) : null}
            <div className="fl-new">
              <small>Aksiya narxi</small>
              <b>
                {c.priceNew} <em>{c.currency}</em>
              </b>
            </div>
          </div>
          {save ? (
            <div className="fl-save">
              Siz tejaysiz: <b>{save} {c.currency}</b>
            </div>
          ) : null}

          <div className="fl-timer">
            <div className="fl-tl">⏰ {c.timerLabel}</div>
            <Clock />
          </div>

          {stock > 0 && (
            <div className="fl-stock">
              <div className="fl-stock-t">
                <span>Omborda qoldi:</span>
                <b>{stock} ta</b>
              </div>
              <div className="fl-bar">
                <i style={{ width: `${stockPct}%` }} />
              </div>
            </div>
          )}

          <OrderForm
            c={c}
            preview={preview}
            className="fl-form"
            head={c.urgency ? <div className="fl-urg">{c.urgency}</div> : null}
          />
        </section>

        {c.benefits.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2 fl-h2">{c.benefitsTitle}</h2>
            <div className="fl-bens">
              {c.benefits.map((b, k) => (
                <div className="fl-ben" key={k}>
                  <span>{b.icon}</span>
                  <b>{b.title}</b>
                  <p>{b.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {c.bundle.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2 fl-h2">Komplektda nimalar bor?</h2>
            <ul className="fl-kit">
              {c.bundle.map((t, k) => (
                <li key={k}>{t}</li>
              ))}
            </ul>
          </section>
        )}

        {c.reviews.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2 fl-h2">
              Mijozlar fikri <small>★ {c.rating}</small>
            </h2>
            <Reviews items={c.reviews} />
          </section>
        )}

        {c.faq.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2 fl-h2">Ko‘p so‘raladigan savollar</h2>
            <FaqList items={c.faq} />
          </section>
        )}

        <footer className="b-foot">{c.footerText}</footer>
      </div>

      <StickyCta
        label={c.ctaText}
        sub={
          off > 0 ? (
            <span className="fl-stk">
              <b>-{off}%</b>
              <small>{c.priceNew}</small>
            </span>
          ) : undefined
        }
      />
    </div>
  );
}
