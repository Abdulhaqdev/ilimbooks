/** Akkauntlar serverdan keladi; tanlangani localStorage'da saqlanadi. */
export type Account = string;

export type AccountRow = { code: string; name: string; active: boolean; sortOrder: number };

const KEY = 'ib_acc';
const LIST_KEY = 'ib_acc_list';
export const DEFAULT_ACCOUNT = 'nazir';

function readList(): AccountRow[] {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    const rows = raw ? (JSON.parse(raw) as AccountRow[]) : [];
    return Array.isArray(rows) ? rows.filter((r) => r && typeof r.code === 'string') : [];
  } catch {
    return [];
  }
}

/** Oxirgi ma'lum akkauntlar ro'yxati (Shell yangilab turadi). */
export function cachedAccounts(): AccountRow[] {
  return readList();
}

export function cacheAccounts(rows: AccountRow[]) {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
  // tanlangan akkaunt o'chirilgan bo'lsa — birinchisiga qaytamiz
  const cur = getAccount();
  if (rows.length && !rows.some((r) => r.code === cur && r.active !== false)) {
    setAccount(rows[0].code, false);
  }
}

export function getAccount(): Account {
  try {
    return localStorage.getItem(KEY) || DEFAULT_ACCOUNT;
  } catch {
    return DEFAULT_ACCOUNT;
  }
}

/**
 * Akkauntni almashtiradi. Butun panel yangi akkaunt ma'lumotlari bilan qayta yuklanadi
 * va bosh sahifaga qaytadi — boshqa akkauntning landingi/buyurtmasi ochiq qolmasligi uchun.
 */
export function setAccount(a: Account, reload = true) {
  try {
    localStorage.setItem(KEY, a);
  } catch {
    /* ignore */
  }
  if (reload) location.href = '/';
}

export function accountLabel(a: Account) {
  return readList().find((x) => x.code === a)?.name || a;
}
