import {
  accentVars,
  Clock,
  discount,
  FaqList,
  Gallery,
  OrderForm,
  Price,
  Reviews,
  scrollToOrder,
  Stars,
  StickyCta,
  usePageTheme,
} from '../blocks';
import type { TemplateProps } from '../shared';
import './t-problem.css';

export default function TProblem({ content: c, preview }: TemplateProps) {
  usePageTheme('#f6f7f9', '#0f172a');
  const off = discount(c);

  return (
    <div className="tpl t-problem" style={accentVars(c.accent, '#10b981')}>
      <section className="pr-pain">
        <div className="tpl-in">
          <div className="pr-brand">{c.brand}</div>
          <h1>{c.problemTitle || 'Sizda ham shunday bo‘ladimi?'}</h1>
          <ul className="pr-list">
            {c.problems.map((p, k) => (
              <li key={k} style={{ animationDelay: `${k * 90}ms` }}>
                <span>✕</span>
                {p}
              </li>
            ))}
          </ul>
          <div className="pr-turn">
            <span>Yechim bor!</span>
            <i>↓</i>
          </div>
        </div>
      </section>

      <div className="tpl-in">
        <section className="pr-sol">
          <Gallery images={c.images} alt={c.title} className="pr-gal">
            {off > 0 && <span className="pr-off">-{off}%</span>}
          </Gallery>
          <div className="pr-sol-body">
            {c.hitBadge ? <span className="pr-badge">{c.hitBadge}</span> : null}
            <h2>{c.title}</h2>
            <p>{c.subtitle}</p>
            {c.rating || c.reviewsCount ? (
              <div className="pr-rate">
                <Stars /> <b>{c.rating}</b>
                {c.reviewsCount ? ` · ${c.reviewsCount} mijoz` : null}
              </div>
            ) : null}
            {c.chips.length > 0 && (
              <div className="pr-chips">
                {c.chips.map((t, k) => (
                  <span key={k}>{t}</span>
                ))}
              </div>
            )}
            <Price c={c} className="pr-price" />
            <button type="button" className="pr-cta" onClick={scrollToOrder}>
              {c.ctaText}
            </button>
          </div>
        </section>

        {c.benefits.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2">{c.benefitsTitle}</h2>
            <ol className="pr-steps">
              {c.benefits.map((b, k) => (
                <li key={k}>
                  <span className="pr-ic">{b.icon}</span>
                  <div>
                    <b>{b.title}</b>
                    <p>{b.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {c.reviews.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2">Natijalar haqida mijozlar</h2>
            <Reviews items={c.reviews} />
          </section>
        )}

        <section className="b-sec">
          <div className="pr-order">
            <h2 className="b-h2">{c.formTitle}</h2>
            <p className="pr-order-sub">{c.formSubtitle}</p>
            <div className="pr-timer">
              <small>{c.timerLabel}</small>
              <Clock />
            </div>
            <OrderForm c={c} preview={preview} head={c.urgency ? <div className="pr-urg">{c.urgency}</div> : null} />
          </div>
        </section>

        {c.guaranteeText ? (
          <section className="b-sec">
            <div className="pr-guar">
              <span>🛡</span>
              <div>
                <b>{c.guaranteeTitle}</b>
                <p>{c.guaranteeText}</p>
              </div>
            </div>
          </section>
        ) : null}

        {c.faq.length > 0 && (
          <section className="b-sec">
            <h2 className="b-h2">Savol-javob</h2>
            <FaqList items={c.faq} />
          </section>
        )}

        <footer className="b-foot">{c.footerText}</footer>
      </div>

      <StickyCta label={c.ctaText} showAfter={700} />
    </div>
  );
}
