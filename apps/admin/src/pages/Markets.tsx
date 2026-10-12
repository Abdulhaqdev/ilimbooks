import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconExternal, IconEye, IconEyeOff, IconOrders, IconPlug, IconPlus } from '../components/icons';
import { accountLabel, getAccount } from '../lib/account';
import { api } from '../lib/api';
import { marketPanel, type KnownMarket, type Market } from '../lib/markets';

type Check = { ok: boolean; message: string } | null;

function Secret({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="a-secret">
      <input
        className="a-in"
        type={show ? 'text' : 'password'}
        autoComplete="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" onClick={() => setShow((s) => !s)} title={show ? 'Yashirish' : 'Ko‘rsatish'}>
        {show ? <IconEyeOff size={16} /> : <IconEye size={16} />}
      </button>
    </div>
  );
}

function Status({ check }: { check: Check }) {
  if (!check) return null;
  return (
    <div className={`a-pixel-status ${check.ok ? 'ok' : 'bad'}`} role="status">
      <span className="a-pixel-dot" aria-hidden />
      <span>{check.message}</span>
    </div>
  );
}

function MarketCard({ m }: { m: Market }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: m.name,
    endpoint: m.endpoint,
    apiKey: '',
    defaultStream: m.defaultStream,
    defaultOfferId: m.defaultOfferId,
    active: m.active,
  });
  const [check, setCheck] = useState<Check>(null);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState('');

  const dirty =
    form.name !== m.name ||
    form.endpoint !== m.endpoint ||
    !!form.apiKey ||
    form.defaultStream !== m.defaultStream ||
    form.defaultOfferId !== m.defaultOfferId ||
    form.active !== m.active;

  const save = useMutation({
    mutationFn: () =>
      api<Market>(`/api/admin/markets/${m.id}`, { method: 'PATCH', body: JSON.stringify(form) }),
    onSuccess: () => {
      setForm((f) => ({ ...f, apiKey: '' }));
      setMsg('Saqlandi');
      setTimeout(() => setMsg(''), 2000);
      qc.invalidateQueries({ queryKey: ['markets'] });
      qc.invalidateQueries({ queryKey: ['landings'] });
    },
    onError: (e) => setMsg(e instanceof Error ? e.message : 'Xatolik'),
  });

  const del = useMutation({
    mutationFn: () => api(`/api/admin/markets/${m.id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['markets'] }),
    onError: (e) => setMsg(e instanceof Error ? e.message : 'Xatolik'),
  });

  async function runCheck() {
    setChecking(true);
    setCheck(null);
    try {
      setCheck(
        await api<{ ok: boolean; message: string }>(`/api/admin/markets/${m.id}/check`, {
          method: 'POST',
          body: JSON.stringify({}),
        }),
      );
    } catch {
      setCheck({ ok: false, message: 'Tekshirib bo‘lmadi' });
    } finally {
      setChecking(false);
    }
  }

  const panel = marketPanel(m.code);
  const ready = m.hasApiKey && !!m.defaultStream;

  return (
    <div className="a-panel a-int">
      <div className="a-int-h">
        <div className={`a-int-ic ${ready ? 'green' : 'amber'}`}>
          <IconOrders size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="a-int-title">
            {m.name}{' '}
            {m.landings ? <span className="a-pill tag">{m.landings} landing</span> : null}
            {!m.active ? <span className="a-pill bad">o‘chirilgan</span> : null}
          </div>
          <div className="a-int-desc">
            {ready
              ? 'Kalit va standart oqim kiritilgan — buyurtmalar uzatiladi'
              : 'API kaliti yoki standart oqim kiritilmagan'}
          </div>
        </div>
        {panel ? (
          <a className="a-icon-btn" href={panel} target="_blank" rel="noreferrer" title="Market paneli">
            <IconExternal size={16} />
          </a>
        ) : null}
        <span className={m.hasApiKey ? 'a-pill ok' : 'a-pill bad'}>
          {m.hasApiKey ? 'Ulangan' : 'Kalit yo‘q'}
        </span>
      </div>

      <div className="a-panel-b a-f">
        <div>
          <label className="a-lbl">API kaliti (api_key)</label>
          <Secret
            value={form.apiKey}
            onChange={(v) => setForm((f) => ({ ...f, apiKey: v }))}
            placeholder={
              m.hasApiKey
                ? `Saqlangan: ${m.apiKeyMask} — almashtirish uchun yangisini kiriting`
                : 'Market panelidan oling'
            }
          />
        </div>
        <div className="a-grid-2">
          <div>
            <label className="a-lbl">Standart oqim (stream)</label>
            <input
              className="a-in"
              value={form.defaultStream}
              onChange={(e) => setForm((f) => ({ ...f, defaultStream: e.target.value }))}
            />
          </div>
          <div>
            <label className="a-lbl">Standart offer_id</label>
            <input
              className="a-in"
              value={form.defaultOfferId}
              onChange={(e) => setForm((f) => ({ ...f, defaultOfferId: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="a-lbl">API manzili</label>
          <input
            className="a-in"
            value={form.endpoint}
            onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))}
          />
        </div>
        <div className="a-note">
          Oqim va offer_id har bir landingda alohida beriladi (
          <Link className="a-link" to="/landings">Landinglar</Link> → Integratsiya). Landingda bo‘sh
          bo‘lsa shu yerdagi standart qiymat ishlatiladi.
        </div>
        <div className="a-row" style={{ margin: 0, flexWrap: 'wrap' }}>
          <button
            className="a-btn p"
            type="button"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
          <button className="a-btn" type="button" disabled={checking || !m.hasApiKey} onClick={runCheck}>
            {checking ? 'Tekshirilmoqda…' : 'Sinov buyurtma yuborish'}
          </button>
          <label className="a-row" style={{ margin: 0, gap: 6, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            <span>Faol</span>
          </label>
          {!m.landings ? (
            <button
              className="a-btn danger"
              type="button"
              onClick={() => {
                if (confirm(`"${m.name}" marketi o‘chirilsinmi?`)) del.mutate();
              }}
            >
              O‘chirish
            </button>
          ) : null}
          {msg ? <span className="a-save-msg ok">{msg}</span> : null}
        </div>
        <Status check={check} />
        <div className="a-hint">
          Sinov buyurtma marketga haqiqiy lead yuboradi (ism «TEST sinov», raqam +998900000000) —
          call-markaz uni e’tiborsiz qoldirishi kerak. Standart oqim va offer_id kiritilgan bo‘lishi
          shart.
        </div>
      </div>
    </div>
  );
}

function AddMarket({ known }: { known: KnownMarket[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [err, setErr] = useState('');

  const create = useMutation({
    mutationFn: () =>
      api<Market>('/api/admin/markets', {
        method: 'POST',
        body: JSON.stringify({ code, name, endpoint, apiKey }),
      }),
    onSuccess: () => {
      setOpen(false);
      setCode('');
      setName('');
      setEndpoint('');
      setApiKey('');
      setErr('');
      qc.invalidateQueries({ queryKey: ['markets'] });
    },
    onError: (e) => setErr(e instanceof Error ? e.message : 'Xatolik'),
  });

  if (!open) {
    return (
      <button className="a-lnew" type="button" onClick={() => setOpen(true)}>
        <span>
          <IconPlus size={22} />
        </span>
        <strong>Market qo‘shish</strong>
        <small>ShoxMarket, Amiram yoki boshqa CPA tizimi</small>
      </button>
    );
  }

  return (
    <div className="a-panel a-int">
      <div className="a-int-h">
        <div className="a-int-ic violet">
          <IconPlug size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="a-int-title">Yangi market</div>
          <div className="a-int-desc">Tanilgan tizimni tanlang yoki qo‘lda kiriting</div>
        </div>
      </div>
      <div className="a-panel-b a-f">
        <div className="a-row" style={{ margin: 0, flexWrap: 'wrap' }}>
          {known.map((k) => (
            <button
              key={k.code}
              className={code === k.code ? 'a-btn sm p' : 'a-btn sm'}
              type="button"
              onClick={() => {
                setCode(k.code);
                setName(k.name);
                setEndpoint(k.endpoint);
              }}
            >
              {k.name}
            </button>
          ))}
        </div>
        <div className="a-grid-2">
          <div>
            <label className="a-lbl">Kod (lotin harflari)</label>
            <input
              className="a-in"
              value={code}
              placeholder="amiram"
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div>
            <label className="a-lbl">Nomi</label>
            <input
              className="a-in"
              value={name}
              placeholder="Amiram"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="a-lbl">API manzili</label>
          <input
            className="a-in"
            value={endpoint}
            placeholder="https://api.Amiram.uz/create"
            onChange={(e) => setEndpoint(e.target.value)}
          />
        </div>
        <div>
          <label className="a-lbl">API kaliti</label>
          <Secret value={apiKey} onChange={setApiKey} placeholder="Market panelidan oling" />
        </div>
        {err ? <div className="a-err">{err}</div> : null}
        <div className="a-row" style={{ margin: 0 }}>
          <button className="a-btn p" type="button" disabled={create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Qo‘shilmoqda…' : 'Qo‘shish'}
          </button>
          <button className="a-btn" type="button" onClick={() => setOpen(false)}>
            Bekor qilish
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Markets() {
  const account = getAccount();
  const q = useQuery({ queryKey: ['markets'], queryFn: () => api<Market[]>('/api/admin/markets') });
  const kq = useQuery({
    queryKey: ['markets-known'],
    queryFn: () => api<KnownMarket[]>('/api/admin/markets/known'),
  });

  useEffect(() => {
    document.title = 'Marketlar';
  }, []);

  return (
    <div>
      <h1 className="a-h1">Marketlar · {accountLabel(account)}</h1>
      <p className="a-sub">
        Landingdan kelgan buyurtma shu CPA tizimiga uzatiladi. API kaliti faqat serverda saqlanadi —
        landingga chiqmaydi.
      </p>

      {q.isLoading ? <p className="muted">Yuklanmoqda…</p> : null}
      {q.isError ? <p className="a-err">Marketlar yuklanmadi</p> : null}

      <div className="a-ints">
        {(q.data || []).map((m) => (
          <MarketCard key={m.id} m={m} />
        ))}
        <AddMarket known={kq.data || []} />
      </div>
    </div>
  );
}
