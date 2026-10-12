/** Bitta akkaunt: nazir. Sozlama kalitlari bare (prefiksisiz) nomlanadi. */
export type Account = 'nazir';

export const ACCOUNTS: Account[] = ['nazir'];

export function normAccount(_v?: string | null): Account {
  return 'nazir';
}

/** Sozlama kaliti — bitta akkaunt bo‘lgani uchun bare kalit. */
export function scopedKey(_account: Account, key: string): string {
  return key;
}
