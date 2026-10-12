/** Akkaunt kodi — Account.code (masalan "nazir", "amiram"). */
export type Account = string;

export const DEFAULT_ACCOUNT = 'nazir';

/** Kiruvchi ?acc= qiymatini xavfsiz kodga aylantiradi (bazada borligi alohida tekshiriladi). */
export function normAccount(v?: string | null): Account {
  const code = String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '')
    .slice(0, 40);
  return code || DEFAULT_ACCOUNT;
}

/** Sozlama kaliti akkaunt bo'yicha ajratiladi: "nazir:meta_pixel". */
export function scopedKey(account: Account, key: string): string {
  return `${normAccount(account)}:${key}`;
}
