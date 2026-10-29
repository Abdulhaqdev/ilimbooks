import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { IconRefresh, IconX } from '../components/icons';
import { Select } from '../components/Select';
import { useToast } from '../components/ui';
import { accountLabel, getAccount } from '../lib/account';
import { api, formatNum } from '../lib/api';
import { useTime } from '../lib/time';

type Lead = {
  id: string;
  name: string;
  phone: string;
  status: string;
  shoxOk: boolean;
  shoxId?: string | null;
  shoxMessage?: string | null;
  offerId?: string | null;
  stream?: string | null;
  marketName?: string | null;
  page?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  tries: number;
  phoneCount: number;
  variantName?: string | null;
  createdAt: string;
};

type Facet = { value: string; count: number };

type OrdersResp = {
  ok: boolean;
  rows: Lead[];
  stats: { total: number; sent: number; failed: number; duplicate: number };
  facets: { pages: Facet[]; creatives: Facet[] };
};

const STATUS: Record<string, { label: string; cls: string }> = {
  sent: { label: 'Yuborildi', cls: 'ok' },
  failed: { label: 'Xato', cls: 'bad' },
  duplicate: { label: 'Qayta lid', cls: 'warn' },
  new: { label: 'Yangi', cls: 'tag' },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function csvCell(v: unknown) {
  const s = v == null ? '' : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(rows: Lead[], file: string) {
  const head = ['Vaqt', 'Ism', 'Telefon', 'Holat', 'Sahifa', 'Variant', 'Manba', 'Kampaniya', 'Kreativ', 'Market', 'Offer', 'Market javobi'];
  const lines = rows.map((r) =>
    [
      new Date(r.createdAt).toLocaleString('uz-UZ'),
      r.name,
      r.phone,
      STATUS[r.status]?.label || r.status,
      r.page,
      r.variantName,
      r.utmSource,
      r.utmCampaign,
      r.utmContent,
      r.marketName,
      r.offerId,
      r.shoxMessage,
    ]
      .map(csvCell)
      .join(';'),
  );
  // BOM — Excel kirill/o'zbek harflarini to'g'ri ochishi uchun
  const blob = new Blob(['\ufeff' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function Orders() {
  const account = getAccount();
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTime();
  const [status, setStatus] = useState('');
  const [allTime, setAllTime] = useState(false);
  const [page, setPage] = useState('');
  const [creative, setCreative] = useState('');
  const [search, setSearch] = useState('');
  const [needle, setNeedle] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setNeedle(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams(allTime ? '' : t.param);
    if (status) p.set('status', status);
    if (page) p.set('page', page);
    if (creative) p.set('creative', creative);
    if (needle) p.set('q', needle);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    const s = p.toString();
    return `/api/admin/orders${s ? `?${s}` : ''}`;
  };

  const retry = useMutation({
    mutationFn: (id: string) => api<{ ok: boolean; message?: string }>(`/api/admin/orders/${id}/retry`, { method: 'POST' }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      if (r.ok) toast.ok('Buyurtma marketga uzatildi');
      else toast.err(r.message || 'Uzatilmadi');
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Xatolik'),
  });
  const retryAll = useMutation({
    mutationFn: () => api<{ ok: boolean; total: number; sent: number }>('/api/admin/orders/retry-failed', { method: 'POST' }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      if (!r.total) toast.ok('Uzatilmagan buyurtma yo‘q');
      else if (r.sent === r.total) toast.ok(`${r.sent} ta buyurtma marketga uzatildi`);
      else toast.err(`${r.total} tadan ${r.sent} tasi uzatildi — qolganlarida market javobini tekshiring`);
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Xatolik'),
  });

  const q = useQuery({
    queryKey: ['orders', account, allTime ? 'all' : t.keyPart, status, page, creative, needle],
    queryFn: () => api<OrdersResp>(query()),
    refetchInterval: 20000,
    placeholderData: keepPreviousData,
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await api<OrdersResp>(query({ limit: '5000' }));
      if (!r.rows.length) return toast.err('Eksport uchun buyurtma yo‘q');
      downloadCsv(r.rows, `buyurtmalar-${account}-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e) {
      toast.err(e instanceof Error ? e.message : 'Eksport bo‘lmadi');
    } finally {
      setExporting(false);
    }
  };

  const st = q.data?.stats;
  const facets = q.data?.facets;
  const filtered = Boolean(page || creative || needle || status);
  const eligible = (st?.sent || 0) + (st?.failed || 0);
  const rate = eligible ? Math.round(((st?.sent || 0) / eligible) * 100) : 0;

  return (
    <div>
      <h1 className="a-h1">Buyurtmalar · {accountLabel(account)}</h1>
      <p className="a-sub">
        Landingdan kelgan buyurtmalar va market API holati. Bir xil mahsulotga telefon / cookie / IP
        (24 soat) bo‘yicha takror — «Qayta lid», marketga yuborilmaydi. Uzatilmaganlar 24 soat ichida
        avtomatik 3 martagacha qayta yuboriladi.
      </p>

      <div className="a-tbar">
        <div className="a-seg">
          <button type="button" className={allTime ? '' : 'on'} onClick={() => setAllTime(false)}>
            Tanlangan davr
          </button>
          <button type="button" className={allTime ? 'on' : ''} onClick={() => setAllTime(true)}>
            Butun davr
          </button>
        </div>
        <div className="a-search">
          <input
            className="a-in"
            value={search}
            placeholder="Ism yoki telefon bo‘yicha qidirish…"
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button type="button" onClick={() => setSearch('')} aria-label="Tozalash">
              <IconX size={14} />
            </button>
          ) : null}
        </div>
        <Select
          ariaLabel="Sahifa"
          value={page}
          onChange={setPage}
          options={[
            { value: '', label: 'Barcha sahifalar' },
            ...(facets?.pages || []).map((f) => ({ value: f.value, label: f.value, hint: String(f.count) })),
          ]}
        />
        <Select
          ariaLabel="Kreativ"
          value={creative}
          onChange={setCreative}
          options={[
            { value: '', label: 'Barcha kreativlar' },
            ...(facets?.creatives || []).map((f) => ({
              value: f.value,
              label: f.value === '—' ? 'Kreativsiz' : f.value,
              hint: String(f.count),
            })),
          ]}
        />
        <button type="button" className="a-btn sm" disabled={exporting} onClick={exportCsv}>
          {exporting ? 'Tayyorlanmoqda…' : 'CSV eksport'}
        </button>
      </div>

      <div className="a-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <button type="button" className={`a-card a-card-btn${status === '' ? ' on' : ''}`} onClick={() => setStatus('')}>
          <div className="a-card-k">Jami buyurtma</div>
          <div className="a-card-v">{formatNum(st?.total || 0)}</div>
        </button>
        <button type="button" className={`a-card a-card-btn${status === 'sent' ? ' on' : ''}`} onClick={() => setStatus(status === 'sent' ? '' : 'sent')}>
          <div className="a-card-k">Marketga yuborildi · {rate}%</div>
          <div className="a-card-v" style={{ color: 'var(--green)' }}>{formatNum(st?.sent || 0)}</div>
        </button>
        <button type="button" className={`a-card a-card-btn${status === 'failed' ? ' on' : ''}`} onClick={() => setStatus(status === 'failed' ? '' : 'failed')}>
          <div className="a-card-k">Uzatilmagan</div>
          <div className="a-card-v" style={{ color: 'var(--red)' }}>{formatNum(st?.failed || 0)}</div>
        </button>
        <button type="button" className={`a-card a-card-btn${status === 'duplicate' ? ' on' : ''}`} onClick={() => setStatus(status === 'duplicate' ? '' : 'duplicate')}>
          <div className="a-card-k">Qayta lid</div>
          <div className="a-card-v" style={{ color: 'var(--amber, #b45309)' }}>{formatNum(st?.duplicate || 0)}</div>
        </button>
      </div>

      {st?.failed ? (
        <div className="a-note warn a-row" style={{ justifyContent: 'space-between' }}>
          <span>
            {st.failed} ta buyurtma marketga yetmagan. Oqim / API kalitini tekshirib, hammasini bir bosishda qayta yuboring.
          </span>
          <button type="button" className="a-btn sm p" disabled={retryAll.isPending} onClick={() => retryAll.mutate()}>
            <IconRefresh size={14} /> {retryAll.isPending ? 'Yuborilmoqda…' : 'Hammasini qayta yuborish'}
          </button>
        </div>
      ) : null}

      <div className="a-panel">
        <div className="a-panel-h a-row" style={{ justifyContent: 'space-between', margin: 0 }}>
          <span>
            {filtered ? 'Filtr bo‘yicha' : 'Oxirgi buyurtmalar'} · {formatNum(q.data?.rows.length || 0)}
          </span>
          {filtered ? (
            <button
              type="button"
              className="a-btn sm"
              onClick={() => {
                setStatus('');
                setPage('');
                setCreative('');
                setSearch('');
              }}
            >
              Filtrni tozalash
            </button>
          ) : null}
        </div>
        <div className="a-tw">
          <table className="a-t">
            <thead>
              <tr>
                <th>Vaqt</th>
                <th>Ism</th>
                <th>Telefon</th>
                <th>Sahifa</th>
                <th>Manba / kreativ</th>
                <th>Market / mahsulot</th>
                <th>Holat</th>
                <th>Market javobi</th>
              </tr>
            </thead>
            <tbody>
              {(q.data?.rows || []).map((r) => {
                const s = STATUS[r.status] || STATUS.new;
                return (
                  <tr key={r.id}>
                    <td className="mono" style={{ fontSize: 12.5 }}>{fmtTime(r.createdAt)}</td>
                    <td style={{ fontWeight: 650 }}>{r.name}</td>
                    <td>
                      <a href={`tel:${r.phone}`} className="a-link">{r.phone}</a>
                      {r.phoneCount > 1 ? (
                        <button
                          type="button"
                          className="a-pill warn a-dup"
                          title="Shu raqamdan kelgan barcha buyurtmalarni ko‘rsatish"
                          onClick={() => setSearch(r.phone)}
                        >
                          {r.phoneCount}× takror
                        </button>
                      ) : null}
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      <span className="mono">{r.page || '—'}</span>
                      {r.variantName ? <div className="muted">{r.variantName}</div> : null}
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {r.utmSource || '—'}
                      {r.utmContent ? ` / ${r.utmContent}` : ''}
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {r.marketName || '—'}
                      {r.offerId ? <span className="muted"> · #{r.offerId}</span> : null}
                    </td>
                    <td>
                      <span className={`a-pill ${s.cls}`}>{s.label}</span>
                      {r.status === 'failed' && r.tries > 1 ? (
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{r.tries} urinish</div>
                      ) : null}
                    </td>
                    <td style={{ fontSize: 12.5 }} className="muted">
                      <div className="a-row" style={{ margin: 0, gap: 6 }}>
                        <span>
                          {r.shoxId ? `#${r.shoxId} · ` : ''}
                          {r.shoxMessage || '—'}
                        </span>
                        {r.status === 'failed' ? (
                          <button
                            className="a-icon-btn"
                            type="button"
                            title="Qayta yuborish"
                            disabled={retry.isPending}
                            onClick={() => retry.mutate(r.id)}
                          >
                            <IconRefresh size={14} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!q.data?.rows.length && !q.isLoading ? (
                <tr>
                  <td colSpan={8} className="muted">
                    {filtered ? 'Filtr bo‘yicha buyurtma topilmadi' : 'Bu davrda buyurtma yo‘q'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
