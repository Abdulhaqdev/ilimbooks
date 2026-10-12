import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
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
  const [status, setStatus] = useState('');
  const q = useQuery({
    queryKey: ['orders', status],
    queryFn: () =>
      api<OrdersResp>(`/api/admin/orders${status ? `?status=${status}` : ''}`),
    refetchInterval: 20000,
  });

  const st = q.data?.stats;

  return (
    <div>
      <h1 className="a-h1">Buyurtmalar</h1>
      <p className="a-sub">Landingdan kelgan buyurtmalar (ism + telefon) va ShoxMarket API holati.</p>

      <div className="a-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="a-card">
          <div className="a-card-k">Jami buyurtma</div>
          <div className="a-card-v">{formatNum(st?.total || 0)}</div>
        </div>
        <div className="a-card">
          <div className="a-card-k">ShoxMarketga yuborildi</div>
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
                <th>Holat</th>
                <th>ShoxMarket javobi</th>
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
                    <td><span className={`a-pill ${s.cls}`}>{s.label}</span></td>
                    <td style={{ fontSize: 12.5 }} className="muted">
                      {r.shoxId ? `#${r.shoxId} · ` : ''}{r.shoxMessage || '—'}
                    </td>
                  </tr>
                );
              })}
              {!q.data?.rows.length && !q.isLoading ? (
                <tr>
                  <td colSpan={6} className="muted">Hali buyurtma yo‘q</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
