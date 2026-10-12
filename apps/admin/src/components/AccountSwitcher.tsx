import { useQuery } from '@tanstack/react-query';
import { accountLabel, cacheAccounts, cachedAccounts, getAccount, setAccount, type AccountRow } from '../lib/account';
import { api } from '../lib/api';
import { Select } from './Select';

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
    <div className="a-acc">
      <span className="a-acc-lbl">Akkaunt</span>
      <Select
        ariaLabel={`Akkaunt: ${accountLabel(current)}`}
        value={rows.some((r) => r.code === current) ? current : rows[0].code}
        options={rows.map((r) => ({ value: r.code, label: r.name }))}
        onChange={(v) => setAccount(v)}
      />
    </div>
  );
}
