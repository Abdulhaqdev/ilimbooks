import { useQuery } from '@tanstack/react-query';
import { useSort } from '../components/useSort';
import { accountLabel, getAccount } from '../lib/account';
import { api, formatNum, LANDING_URL } from '../lib/api';
import { useTime } from '../lib/time';

type Analytics = {
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
  creatives: {
    content: string;
    campaign: string;
    sessions: number;
    conv: number;
    cr: number;
  }[];
  buttons: {
    page: string;
    button: string;
    text: string;
    clicks: number;
    users: number;
  }[];
  devices: { name: string; count: number; pct: number }[];
  browsers: { name: string; count: number; pct: number }[];
  os: { name: string; count: number; pct: number }[];
  sources: { name: string; count: number; pct: number }[];
};

function Bars({
  title,
  rows,
  note,
}: {
  title: string;
  rows: { name: string; count: number; pct: number }[];
  note?: string;
}) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="a-panel">
      <div className="a-panel-h">
        <span>{title}</span>
        {note ? <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{note}</span> : null}
      </div>
      <div className="a-panel-b">
        <div className="hbar">
          {rows.map((r) => (
            <div className="hbar-row" key={r.name}>
              <span>{r.name}</span>
              <div className="hbar-track">
                <div className="hbar-fill" style={{ width: `${Math.round((r.count / max) * 100)}%` }} />
              </div>
              <span className="num">
                {formatNum(r.count)} · {r.pct}%
              </span>
            </div>
          ))}
          {!rows.length ? <p className="muted">Ma’lumot yo‘q</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const account = getAccount();
  const t = useTime();
  const q = useQuery({
    queryKey: ['analytics', t.keyPart, account],
    queryFn: () => api<Analytics>(`/api/admin/analytics?${t.param}`),
  });
  const data = q.data;
  const accPages = data?.pages || [];

  const pageAcc = {
    name: (r: Analytics['pages'][0]) => r.name,
    sessions: (r: Analytics['pages'][0]) => r.sessions,
    viewers: (r: Analytics['pages'][0]) => r.viewers,
    clicks: (r: Analytics['pages'][0]) => r.clicks,
    clickUsers: (r: Analytics['pages'][0]) => r.clickUsers,
    cr: (r: Analytics['pages'][0]) => r.cr,
  };
  const { rows: pages, th: thPage } = useSort(accPages, pageAcc, 'clicks');

  const crAcc = {
    content: (r: Analytics['creatives'][0]) => r.content,
    campaign: (r: Analytics['creatives'][0]) => r.campaign,
    sessions: (r: Analytics['creatives'][0]) => r.sessions,
    conv: (r: Analytics['creatives'][0]) => r.conv,
    cr: (r: Analytics['creatives'][0]) => r.cr,
  };
  const { rows: creatives, th: thCr } = useSort(data?.creatives || [], crAcc, 'sessions');

  const btnAcc = {
    page: (r: Analytics['buttons'][0]) => r.page,
    button: (r: Analytics['buttons'][0]) => r.button,
    text: (r: Analytics['buttons'][0]) => r.text,
    clicks: (r: Analytics['buttons'][0]) => r.clicks,
    users: (r: Analytics['buttons'][0]) => r.users,
  };
  const { rows: buttons, th: thBtn } = useSort(data?.buttons || [], btnAcc, 'clicks');

  const maxCr = Math.max(...(creatives.map((c) => c.cr) || [1]), 1);

  function adLink(page: string, slug: string) {
    const u = new URL(page === '/' ? LANDING_URL : `${LANDING_URL.replace(/\/$/, '')}${page}`);
    u.searchParams.set('utm_source', 'instagram');
    u.searchParams.set('utm_content', slug);
    return u.toString().replace(/^https?:\/\//, '');
  }

  return (
    <div>
      <h1 className="a-h1">Analitika · {accountLabel(account)}</h1>
      <p className="a-sub">
        Qaysi kreativ pul olib kelayotganini shu yerda ko‘rasiz — ustun nomini bosib saralang.
      </p>

      {data ? (
        <>
          <div className="a-panel">
            <div className="a-panel-h">
              <span>Sahifalar bo‘yicha — kim keldi, kim bosdi</span>
              <span className="muted" style={{ fontWeight: 400, fontSize: 12.5 }}>
                {formatNum(pages.reduce((a, p) => a + p.sessions, 0))} kirish ·{' '}
                {formatNum(pages.reduce((a, p) => a + p.clicks, 0))} bosish
              </span>
            </div>
            <div className="a-tw">
              <table className="a-t">
                <thead>
                  <tr>
                    {thPage('name', 'Sahifa')}
                    {thPage('sessions', 'Kirdi', { num: true })}
                    {thPage('viewers', 'Ko‘rdi', { num: true })}
                    {thPage('clicks', 'Bosildi', { num: true })}
                    {thPage('clickUsers', 'Bosgan odam', { num: true })}
                    {thPage('cr', 'CR', { num: true })}
                    <th>Reklama havolasi</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p) => (
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
                      <td className="num" style={{ color: 'var(--green)', fontWeight: 700 }}>
                        {p.cr}%
                      </td>
                      <td>
                        <code className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                          {adLink(p.page, p.slug)}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="a-panel">
            <div className="a-panel-h">Instagram kreativlari bo‘yicha konversiya</div>
            <div className="a-tw">
              <table className="a-t">
                <thead>
                  <tr>
                    {thCr('content', 'utm_content')}
                    {thCr('campaign', 'Kampaniya')}
                    {thCr('sessions', 'Sessiya', { num: true })}
                    {thCr('conv', 'Botga o‘tdi', { num: true })}
                    {thCr('cr', 'CR', { num: true })}
                    <th style={{ width: 120 }} />
                  </tr>
                </thead>
                <tbody>
                  {creatives.map((c) => (
                    <tr key={`${c.content}-${c.campaign}`}>
                      <td>
                        <span className="a-pill tag">{c.content}</span>
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {c.campaign}
                      </td>
                      <td className="num">{formatNum(c.sessions)}</td>
                      <td className="num">{formatNum(c.conv)}</td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {c.cr}%
                      </td>
                      <td>
                        <span className="a-bar-t">
                          <span className="a-bar-f" style={{ width: `${Math.round((c.cr / maxCr) * 100)}%` }} />
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!creatives.length ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        Hali kreativ statistikasi yo‘q
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="a-cols">
            <div className="a-panel">
              <div className="a-panel-h">Tugmalar reytingi</div>
              <div className="a-tw">
                <table className="a-t">
                  <thead>
                    <tr>
                      {thBtn('page', 'Sahifa')}
                      {thBtn('button', 'Tugma')}
                      {thBtn('text', 'Matn')}
                      {thBtn('clicks', 'Bosish', { num: true })}
                      {thBtn('users', 'Foydalanuvchi', { num: true })}
                    </tr>
                  </thead>
                  <tbody>
                    {buttons.map((b, i) => (
                      <tr key={i}>
                        <td>{b.page}</td>
                        <td>
                          <span className="a-pill tag">{b.button}</span>
                        </td>
                        <td>{b.text}</td>
                        <td className="num" style={{ fontWeight: 700 }}>
                          {formatNum(b.clicks)}
                        </td>
                        <td className="num">{formatNum(b.users)}</td>
                      </tr>
                    ))}
                    {!buttons.length ? (
                      <tr>
                        <td colSpan={5} className="muted">
                          Hali bosishlar yo‘q
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <Bars title="Qurilma" rows={data.devices} />
              <Bars title="Brauzer" rows={data.browsers} note="instagram — in-app WebView" />
            </div>
          </div>

          <div className="a-cols">
            <Bars title="OS" rows={data.os} />
            <Bars title="Trafik manbasi (utm_source)" rows={data.sources} />
          </div>
        </>
      ) : (
        <p className="muted">Yuklanmoqda…</p>
      )}
    </div>
  );
}
