import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { IconClock, IconPointer, IconSend, IconTrendUp } from '../components/icons';
import { useSort } from '../components/useSort';
import { accountLabel, getAccount } from '../lib/account';
import { api, formatNum } from '../lib/api';
import { Toggle } from '../components/ui';
import { chartColors, useTheme } from '../lib/theme';
import { useTime } from '../lib/time';

type Dash = {
  kpis: {
    online: number;
    sessions: number;
    conversions: number;
    cr: number;
    avgDwellSec: number;
    events: number;
    leads: number;
    leadCr: number;
  };
  hours: { t: string; sessions: number; conv: number }[];
  pages: {
    page: string;
    name: string;
    note: string;
    slug: string;
    sessions: number;
    viewers: number;
    clicks: number;
    clickUsers: number;
    cr: number;
  }[];
};

function formatDwell(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} daq ${s} s` : `${s} s`;
}

export default function Dashboard() {
  const account = getAccount();
  const t = useTime();
  const [auto, setAuto] = useState(true);
  const cc = chartColors(useTheme().theme);
  const q = useQuery({
    queryKey: ['dashboard', t.keyPart, account],
    queryFn: () => api<Dash>(`/api/admin/dashboard?${t.param}`),
    refetchInterval: auto && !t.isPastDay ? 30_000 : false,
  });

  useEffect(() => {
    document.title = 'Dashboard';
  }, []);

  const data = q.data;
  const accPages = data?.pages || [];
  const pageAcc = {
    name: (r: Dash['pages'][0]) => r.name,
    sessions: (r: Dash['pages'][0]) => r.sessions,
    viewers: (r: Dash['pages'][0]) => r.viewers,
    clicks: (r: Dash['pages'][0]) => r.clicks,
    clickUsers: (r: Dash['pages'][0]) => r.clickUsers,
    cr: (r: Dash['pages'][0]) => r.cr,
  };
  const { rows, th } = useSort(accPages, pageAcc, 'clicks');
  const maxClicks = Math.max(...(accPages.map((p) => p.clicks) || [1]), 1);

  return (
    <div>
      <div className="a-row spread">
        <div>
          <h1 className="a-h1">Dashboard · {accountLabel(account)}</h1>
          <p className="a-sub">Instagram trafigi va konversiya — real vaqtda</p>
        </div>
        <div className="a-row" style={{ margin: 0 }}>
          <label className="a-switch-inline">
            <Toggle checked={auto} disabled={t.isPastDay} onChange={setAuto} />
            <span>30s da yangilash</span>
          </label>
        </div>
      </div>

      {q.isLoading && !data ? <p className="muted">Yuklanmoqda…</p> : null}
      {data ? (
        <>
          <div className="a-kpis">
            {[
              {
                tone: 'blue',
                icon: <IconPointer size={20} />,
                k: 'Click',
                v: formatNum(data.kpis.sessions),
                h: `saytga kirganlar · ${formatNum(data.kpis.online)} onlayn`,
              },
              {
                tone: 'amber',
                icon: <IconClock size={20} />,
                k: 'Saytda qolgan vaqt',
                v: formatDwell(data.kpis.avgDwellSec),
                h: 'o‘rtacha, bitta tashrif',
              },
              {
                tone: 'green',
                icon: <IconSend size={20} />,
                k: 'Lid yuborish',
                v: formatNum(data.kpis.leads),
                h: 'buyurtma formasi yuborildi',
              },
              {
                tone: 'violet',
                icon: <IconTrendUp size={20} />,
                k: 'Konversiya',
                v: `${data.kpis.leadCr}%`,
                h: 'click → lid',
              },
            ].map((c) => (
              <div className={`a-kpi ${c.tone}`} key={c.k}>
                <div className="a-kpi-top">
                  <span className="a-kpi-k">{c.k}</span>
                  <span className="a-kpi-i" aria-hidden="true">
                    {c.icon}
                  </span>
                </div>
                <div className="a-kpi-v">{c.v}</div>
                <div className="a-kpi-h">{c.h}</div>
              </div>
            ))}
          </div>

          <div className="a-panel">
            <div className="a-panel-h">
              <span>Soatlar bo‘yicha trafik</span>
            </div>
            <div className="a-panel-b" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.hours}>
                  <CartesianGrid stroke={cc.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="t"
                    tick={{ fill: cc.axis, fontSize: 11 }}
                    stroke={cc.grid}
                    minTickGap={24}
                  />
                  <YAxis tick={{ fill: cc.axis, fontSize: 11 }} stroke={cc.grid} />
                  <Tooltip
                    contentStyle={{
                      background: cc.tooltipBg,
                      border: `1px solid ${cc.tooltipBorder}`,
                      borderRadius: 12,
                      color: cc.text,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                    }}
                    labelStyle={{ color: cc.text, fontWeight: 700 }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="sessions" name="Sessiyalar" stroke={cc.primary} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="conv" name="Konversiyalar" stroke={cc.accent} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="a-panel">
            <div className="a-panel-h">
              <span>Sahifalar bo‘yicha — kim keldi, kim bosdi</span>
              <span className="muted" style={{ fontWeight: 400, fontSize: 12.5 }}>
                {formatNum(data.kpis.sessions)} kirish · {formatNum(data.kpis.conversions)} bosish
              </span>
            </div>
            <div className="a-tw">
              <table className="a-t">
                <thead>
                  <tr>
                    {th('name', 'Sahifa')}
                    {th('sessions', 'Kirdi', { num: true })}
                    {th('viewers', 'Ko‘rdi', { num: true })}
                    {th('clicks', 'Bosildi', { num: true })}
                    {th('clickUsers', 'Bosgan odam', { num: true })}
                    {th('cr', 'CR', { num: true })}
                    <th style={{ width: 120 }} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.page}>
                      <td>
                        <strong>{p.name}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {p.page} · {p.note}
                        </div>
                      </td>
                      <td className="num">{formatNum(p.sessions)}</td>
                      <td className="num">{formatNum(p.viewers)}</td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {formatNum(p.clicks)}
                      </td>
                      <td className="num">{formatNum(p.clickUsers)}</td>
                      <td className="num" style={{ fontWeight: 700, color: p.cr > 0 ? 'var(--green)' : undefined }}>
                        {p.cr}%
                      </td>
                      <td>
                        <span className="a-bar-t">
                          <span
                            className="a-bar-f"
                            style={{ width: `${Math.round((p.clicks / maxClicks) * 100)}%` }}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
