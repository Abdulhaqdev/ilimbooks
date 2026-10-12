import type { Range } from '../lib/api';
import { todayTashkent, useTime } from '../lib/time';

const RANGES: [Range, string][] = [
  ['24h', '24 soat'],
  ['3d', '3 kun'],
  ['7d', '7 kun'],
  ['30d', '30 kun'],
];

export function TimeBar() {
  const t = useTime();
  const today = todayTashkent();

  return (
    <div className="a-timebar">
      <div className="a-seg">
        {RANGES.map(([r, l]) => (
          <button
            key={r}
            type="button"
            className={t.mode === 'range' && t.range === r ? 'on' : undefined}
            onClick={() => t.setRange(r)}
          >
            {l}
          </button>
        ))}
        <button
          type="button"
          className={t.mode === 'day' ? 'on' : undefined}
          onClick={() => t.setMode('day')}
        >
          Kun
        </button>
      </div>

      {t.mode === 'day' ? (
        <div className="a-day">
          <button type="button" onClick={t.prevDay} aria-label="Oldingi kun">
            ‹
          </button>
          <input
            type="date"
            value={t.day}
            max={today}
            onChange={(e) => e.target.value && t.setDay(e.target.value)}
          />
          <button
            type="button"
            onClick={t.nextDay}
            disabled={t.day >= today}
            aria-label="Keyingi kun"
          >
            ›
          </button>
          <button type="button" className="a-today" onClick={t.goToday}>
            Bugun
          </button>
        </div>
      ) : null}
    </div>
  );
}
