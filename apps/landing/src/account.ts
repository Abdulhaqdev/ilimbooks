export type Account = 'nazir';

/** Bitta akkaunt. */
export function currentAccount(): Account {
  return 'nazir';
}

/** Kadr yo‘lini normalizatsiya qiladi. */
export function normalizePath(path: string): string {
  const p = (path || '/').split('?')[0].replace(/\/+$/, '');
  return p || '/';
}
