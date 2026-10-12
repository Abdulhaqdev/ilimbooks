import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Range } from './api';

const TZ = 5 * 3600_000; // Asia/Tashkent

export function todayTashkent(): string {
  return new Date(Date.now() + TZ).toISOString().slice(0, 10);
}

export function shiftDay(day: string, delta: number): string {
  const t = new Date(`${day}T00:00:00.000Z`).getTime() + delta * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export function dayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  const wd = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'][d.getUTCDay()];
  return `${day} · ${wd}`;
}

type Mode = 'range' | 'day';
type TimeState = { mode: Mode; range: Range; day: string };

type TimeCtx = TimeState & {
  setRange: (r: Range) => void;
  setDay: (d: string) => void;
  setMode: (m: Mode) => void;
  prevDay: () => void;
  nextDay: () => void;
  goToday: () => void;
  param: string;
  keyPart: string;
  isPastDay: boolean;
};

const Ctx = createContext<TimeCtx | null>(null);
const KEY = 'ob_time';

function load(): TimeState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '');
    if (raw && (raw.mode === 'range' || raw.mode === 'day')) {
      return {
        mode: raw.mode,
        range: raw.range || '24h',
        day: raw.day || todayTashkent(),
      };
    }
  } catch {
    /* ignore */
  }
  return { mode: 'range', range: '24h', day: todayTashkent() };
}

export function TimeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimeState>(load);

  function update(patch: Partial<TimeState>) {
    setState((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const value: TimeCtx = {
    ...state,
    setRange: (range) => update({ range, mode: 'range' }),
    setDay: (day) => update({ day, mode: 'day' }),
    setMode: (mode) => update({ mode }),
    prevDay: () => update({ mode: 'day', day: shiftDay(state.day, -1) }),
    nextDay: () => update({ mode: 'day', day: shiftDay(state.day, 1) }),
    goToday: () => update({ mode: 'day', day: todayTashkent() }),
    param: state.mode === 'day' ? `day=${state.day}` : `range=${state.range}`,
    keyPart: state.mode === 'day' ? `day:${state.day}` : `range:${state.range}`,
    isPastDay: state.mode === 'day' && state.day < todayTashkent(),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTime() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTime must be used within TimeProvider');
  return c;
}
