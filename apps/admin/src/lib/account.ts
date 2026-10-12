export type Account = 'nazir';

export const ACCOUNTS: { id: Account; label: string }[] = [
  { id: 'nazir', label: 'Ilimbooks' },
];

export function getAccount(): Account {
  return 'nazir';
}

export function setAccount(_a: Account) {
  /* bitta akkaunt — noop */
}

export function accountLabel(a: Account) {
  return ACCOUNTS.find((x) => x.id === a)?.label || a;
}
