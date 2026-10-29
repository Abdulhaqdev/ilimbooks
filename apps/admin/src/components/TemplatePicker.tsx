import { TEMPLATE_TONE, TEMPLATES, type Template } from '../lib/landings';
import { IconCheck } from './icons';

/** Shablonlarni belgilash. `locked` — o'chirib bo'lmaydigan (masalan, asosiy landingning o'z shabloni). */
export function TemplatePicker({
  value,
  onChange,
  locked = [],
  hidden = [],
}: {
  value: string[];
  onChange: (v: string[]) => void;
  locked?: string[];
  hidden?: string[];
}) {
  return (
    <div className="a-tplpick">
      {TEMPLATES.filter((t) => !hidden.includes(t.id)).map((t) => {
        const isLocked = locked.includes(t.id);
        const on = isLocked || value.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            className={on ? 'on' : undefined}
            disabled={isLocked}
            aria-pressed={on}
            style={{ ['--tone' as string]: TEMPLATE_TONE[t.id] }}
            onClick={() => onChange(on ? value.filter((x) => x !== t.id) : [...value, t.id as Template])}
          >
            <span className="a-tplpick-box">{on ? <IconCheck size={12} /> : null}</span>
            <span className="a-tplpick-t">
              <strong>
                {t.label}
                {isLocked ? <em>asosiy</em> : null}
              </strong>
              <small>{t.hint}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TemplateBadge({ t, label }: { t: string; label: string }) {
  return (
    <span className="a-tbadge" style={{ ['--tone' as string]: TEMPLATE_TONE[t] }}>
      {label}
    </span>
  );
}
