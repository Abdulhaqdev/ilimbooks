import { useQuery } from '@tanstack/react-query';
import { accountLabel, cacheAccounts, cachedAccounts, getAccount, setAccount, type AccountRow } from '../lib/account';
import { api } from '../lib/api';

/**
 * Akkaunt almashtirgich. Tanlov localStorage'da — barcha admin so'rovlari ?acc= bilan ketadi,
 * shuning uchun almashtirilganda sahifa qayta yuklanadi.
 */
export default function AccountSwitcher() {
  const current = getAccount();
  const q = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const rows = await api<AccountRow[]>('/api/admin/accounts');
      cacheAccounts(rows);
      return rows;
    },
    staleTime: 5 * 60_000,
  });

  const rows = (q.data || cachedAccounts()).filter((r) => r.active !== false);
  if (rows.length < 2) {
    return rows.length === 1 ? <span className="a-acc-one">{rows[0].name}</span> : null;
  }

  return (
    <label className="a-acc">
      <span className="a-acc-lbl">Akkaunt</span>
      <select
        className="a-acc-sel"
        value={rows.some((r) => r.code === current) ? current : rows[0].code}
        onChange={(e) => setAccount(e.target.value)}
        title={accountLabel(current)}
      >
        {rows.map((r) => (
          <option key={r.code} value={r.code}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
  );
}
