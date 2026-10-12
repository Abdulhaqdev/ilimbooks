import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'adm-theme';

function initialTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  if (attr === 'light' || attr === 'dark') return attr;
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

type Ctx = { theme: Theme; toggle: () => void };
const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b1020' : '#f4f6fb');
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/** Recharts SVG atributlari CSS o‘zgaruvchilarini qabul qilmaydi — ranglar JS'da. */
export function chartColors(theme: Theme) {
  return theme === 'dark'
    ? {
        grid: '#223052',
        axis: '#8b97b0',
        tooltipBg: '#141d33',
        tooltipBorder: '#26345a',
        text: '#e6ebf5',
        primary: '#818cf8',
        accent: '#fbbf24',
      }
    : {
        grid: '#e7eaf3',
        axis: '#7a8499',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e2e6f0',
        text: '#111827',
        primary: '#6366f1',
        accent: '#f59e0b',
      };
}
