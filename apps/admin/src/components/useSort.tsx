import { useMemo, useState } from 'react';

type Accessor<T> = Record<string, (row: T) => string | number>;

export function useSort<T>(rows: T[], accessors: Accessor<T>, initial: string, dir0: 'asc' | 'desc' = 'desc') {
  const [key, setKey] = useState(initial);
  const [dir, setDir] = useState<'asc' | 'desc'>(dir0);
  const sorted = useMemo(() => {
    const fn = accessors[key];
    if (!fn) return rows;
    const m = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = fn(a);
      const vb = fn(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * m;
      return String(va).localeCompare(String(vb), 'uz') * m;
    });
  }, [rows, accessors, key, dir]);

  function th(k: string, label: string, opts?: { num?: boolean }) {
    const on = k === key;
    return (
      <th className={opts?.num ? 'num' : undefined} aria-sort={on ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'}>
        <button
          type="button"
          className={on ? 'a-sort on' : 'a-sort'}
          onClick={() => {
            if (k === key) setDir((d) => (d === 'desc' ? 'asc' : 'desc'));
            else {
              setKey(k);
              setDir('desc');
            }
          }}
        >
          {label}
          <span className="a-sort-i">{on ? (dir === 'desc' ? '▼' : '▲') : '↕'}</span>
        </button>
      </th>
    );
  }

  return { rows: sorted, th };
}
