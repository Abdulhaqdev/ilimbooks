import { getAccount } from './account';

export type Range = '24h' | '3d' | '7d' | '30d';

/** Admin so‘rovlariga tanlangan akkauntni (?acc=) qo‘shadi (login/logout bundan tashqari). */
function withAccount(path: string): string {
  if (!path.startsWith('/api/admin/')) return path;
  if (/\/(login|logout)(\?|$)/.test(path)) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}acc=${getAccount()}`;
}

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(withAccount(path), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (res.status === 401) {
    if (!location.pathname.startsWith('/login')) {
      location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Xatolik');
  return data as T;
}

export const LANDING_URL =
  import.meta.env.VITE_LANDING_URL || 'https://ilimbooks.uz';

export function formatNum(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n);
}

export function rangeLabel(r: Range) {
  return (
    { '24h': '24 soat', '3d': '3 kun', '7d': '7 kun', '30d': '30 kun' } as const
  )[r];
}
