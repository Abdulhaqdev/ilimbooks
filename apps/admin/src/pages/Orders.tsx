import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { IconRefresh } from '../components/icons';
import { useToast } from '../components/ui';
import { accountLabel, getAccount } from '../lib/account';
import { api, formatNum } from '../lib/api';

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
  utmContent?: string | null;
  createdAt: string;
};

type OrdersResp = {
  ok: boolean;
  rows: Lead[];
  stats: { total: number; sent: number; failed: number };
};

const STATUS: Record<string, { label: string; cls: string }> = {
  sent: { label: 'Yuborildi', cls: 'ok' },
  failed: { label: 'Xato', cls: 'bad' },
  new: { label: 'Yangi', cls: 'tag' },
};

export default function Orders() {
  const account = getAccount();
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const retry = useMutation({
    mutationFn: (id: string) => api<{ ok: boolean; message?: string }>(`/api/admin/orders/${id}/retry`, { method: 'POST' }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      if (r.ok) toast.ok('Buyurtma marketga uzatildi');
      else toast.err(r.message || 'Uzatilmadi');
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Xatolik'),
  });
  const q = useQuery({
    queryKey: ['orders', status],
    queryFn: () =>
      api<OrdersResp>(`/api/admin/orders${status ? `?status=${status}` : ''}`),
    refetchInterval: 20000,
  });

  const st = q.data?.stats;

  return (
    <div>
      <h1 className="a-h1">Buyurtmalar · {accountLabel(account)}</h1>
      <p className="a-sub">
        Landingdan kelgan buyurtmalar (ism + telefon) va market API holati. Uzatilmagan buyurtma
        bazada saqlanadi — oqimni tuzatib, qayta yuborish mumkin.
      </p>

      <div className="a-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="a-card">
          <div className="a-card-k">Jami buyurtma</div>
          <div className="a-card-v">{formatNum(st?.total || 0)}</div>
        </div>
        <div className="a-card">
          <div className="a-card-k">Marketga yuborildi</div>
          <div className="a-card-v" style={{ color: 'var(--green)' }}>{formatNum(st?.sent || 0)}</div>
        </div>
        <div className="a-card">
          <div className="a-card-k">Xato (qayta yuborish kerak)</div>
          <div className="a-card-v" style={{ color: 'var(--red)' }}>{formatNum(st?.failed || 0)}</div>
        </div>
      </div>

      <div className="a-row" style={{ gap: 8 }}>
        {[
          ['', 'Hammasi'],
          ['sent', 'Yuborilgan'],
          ['failed', 'Xato'],
          ['new', 'Yangi'],
        ].map(([v, l]) => (
          <button
            key={v}
            type="button"
            className={status === v ? 'a-btn p sm' : 'a-btn sm'}
            onClick={() => setStatus(v)}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="a-panel">
        <div className="a-panel-h">Oxirgi buyurtmalar</div>
        <div className="a-tw">
          <table className="a-t">
            <thead>
              <tr>
                <th>Vaqt</th>
                <th>Ism</th>
                <th>Telefon</th>
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
                    <td className="mono" style={{ fontSize: 12.5 }}>
                      {new Date(r.createdAt).toLocaleString('uz-UZ', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ fontWeight: 650 }}>{r.name}</td>
                    <td>
                      <a href={`tel:${r.phone}`} className="a-link">{r.phone}</a>
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {(r.utmSource || '—')}{r.utmContent ? ` / ${r.utmContent}` : ''}
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {r.marketName || '—'}
                      {r.offerId ? <span className="muted"> · #{r.offerId}</span> : null}
                    </td>
                    <td><span className={`a-pill ${s.cls}`}>{s.label}</span></td>
                    <td style={{ fontSize: 12.5 }} className="muted">
                      <div className="a-row" style={{ margin: 0, gap: 6 }}>
                        <span>{r.shoxId ? `#${r.shoxId} · ` : ''}{r.shoxMessage || '—'}</span>
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
                  <td colSpan={7} className="muted">Hali buyurtma yo‘q</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
