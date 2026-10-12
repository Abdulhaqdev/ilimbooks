import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconChart, IconEye, IconEyeOff, IconOrders, IconPlug } from '../components/icons';
import { api } from '../lib/api';

type Values = {
  shox_endpoint: string;
  shox_api_key: string;
  shox_stream: string;
  shox_offer_id: string;
  meta_pixel: string;
  meta_capi_token: string;
};

type Check = { ok: boolean; message: string } | null;

const EMPTY: Values = {
  shox_endpoint: '',
  shox_api_key: '',
  shox_stream: '',
  shox_offer_id: '',
  meta_pixel: '',
  meta_capi_token: '',
};

function SecretInput({
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

function Integration({
  icon,
  tone,
  title,
  desc,
  connected,
  children,
}: {
  icon: ReactNode;
  tone: string;
  title: string;
  desc: string;
  connected: boolean;
  children: ReactNode;
}) {
  return (
    <div className="a-panel a-int">
      <div className="a-int-h">
        <div className={`a-int-ic ${tone}`}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="a-int-title">{title}</div>
          <div className="a-int-desc">{desc}</div>
        </div>
        <span className={connected ? 'a-pill ok' : 'a-pill bad'}>
          {connected ? 'Ulangan' : 'Sozlanmagan'}
        </span>
      </div>
      <div className="a-panel-b a-f">{children}</div>
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

export default function Settings() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<{ values: Values }>('/api/admin/settings'),
  });
  const [form, setForm] = useState<Values>(EMPTY);
  const [msg, setMsg] = useState('');
  const [pixelCheck, setPixelCheck] = useState<Check>(null);
  const [capiCheck, setCapiCheck] = useState<Check>(null);
  const [checking, setChecking] = useState('');

  useEffect(() => {
    document.title = 'Sozlamalar';
  }, []);

  useEffect(() => {
    if (q.data?.values) setForm({ ...EMPTY, ...q.data.values });
  }, [q.data]);

  const saved = q.data?.values || EMPTY;
  const dirty = JSON.stringify(form) !== JSON.stringify({ ...EMPTY, ...saved });

  const save = useMutation({
    mutationFn: (values: Values) =>
      api('/api/admin/settings', { method: 'PATCH', body: JSON.stringify({ values }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setMsg('Saqlandi');
      setTimeout(() => setMsg(''), 2000);
    },
    onError: (e) => setMsg(e instanceof Error ? e.message : 'Xatolik'),
  });

  const set = (k: keyof Values, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function runPixelCheck() {
    setChecking('pixel');
    try {
      setPixelCheck(await api(`/api/admin/pixel/check?id=${encodeURIComponent(form.meta_pixel)}`));
    } catch {
      setPixelCheck({ ok: false, message: 'Tekshirib bo‘lmadi' });
    } finally {
      setChecking('');
    }
  }

  async function runCapiCheck() {
    setChecking('capi');
    try {
      setCapiCheck(
        await api('/api/admin/capi/check', {
          method: 'POST',
          body: JSON.stringify({ token: form.meta_capi_token, pixelId: form.meta_pixel }),
        }),
      );
    } catch {
      setCapiCheck({ ok: false, message: 'Tekshirib bo‘lmadi' });
    } finally {
      setChecking('');
    }
  }

  const shoxOk = !!saved.shox_api_key && !!saved.shox_stream;

  return (
    <div>
      <div className="a-row spread">
        <div>
          <h1 className="a-h1">Sozlamalar</h1>
          <p className="a-sub" style={{ marginBottom: 0 }}>
            Integratsiyalar va API kalitlari. Maxfiy qiymatlar faqat serverda saqlanadi — landingga
            chiqmaydi.
          </p>
        </div>
        <div className="a-row" style={{ margin: 0 }}>
          {msg ? <span className="a-save-msg ok">{msg}</span> : dirty ? <span className="a-save-msg">Saqlanmagan o‘zgarishlar</span> : null}
          <button className="a-btn p" type="button" disabled={!dirty || save.isPending} onClick={() => save.mutate(form)}>
            {save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </div>
      </div>

      <div className="a-ints">
        <Integration
          icon={<IconOrders size={22} />}
          tone="green"
          title="ShoxMarket"
          desc="Landingdan kelgan har bir buyurtma shu API orqali ShoxMarket’ga yuboriladi"
          connected={shoxOk}
        >
          <div>
            <label className="a-lbl">API kaliti (api_key)</label>
            <SecretInput value={form.shox_api_key} onChange={(v) => set('shox_api_key', v)} placeholder="ShoxMarket panelidan oling" />
          </div>
          <div className="a-grid-2">
            <div>
              <label className="a-lbl">Standart oqim (stream)</label>
              <input className="a-in" value={form.shox_stream} onChange={(e) => set('shox_stream', e.target.value)} />
            </div>
            <div>
              <label className="a-lbl">Standart offer_id</label>
              <input className="a-in" value={form.shox_offer_id} onChange={(e) => set('shox_offer_id', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="a-lbl">API manzili</label>
            <input
              className="a-in"
              value={form.shox_endpoint}
              placeholder="https://api.shoxmarket.uz/create"
              onChange={(e) => set('shox_endpoint', e.target.value)}
            />
          </div>
          <div className="a-note">
            Oqim va offer_id har bir landingda alohida berilishi mumkin (
            <Link className="a-link" to="/landings">Landinglar</Link> → Pixel va ShoxMarket). Landingda bo‘sh
            bo‘lsa, shu yerdagi standart qiymat ishlatiladi.
          </div>
        </Integration>

        <Integration
          icon={<IconChart size={22} />}
          tone="blue"
          title="Meta Pixel"
          desc="Brauzerdagi PageView va Lead eventlari — reklama optimizatsiyasi uchun"
          connected={!!saved.meta_pixel}
        >
          <div>
            <label className="a-lbl">Standart Pixel ID</label>
            <div className="a-row" style={{ margin: 0 }}>
              <input
                className="a-in"
                style={{ flex: 1 }}
                value={form.meta_pixel}
                placeholder="879714067250592"
                onChange={(e) => {
                  set('meta_pixel', e.target.value);
                  setPixelCheck(null);
                }}
              />
              <button className="a-btn" type="button" disabled={checking === 'pixel'} onClick={runPixelCheck}>
                {checking === 'pixel' ? 'Tekshirilmoqda…' : 'Tekshirish'}
              </button>
            </div>
            <Status check={pixelCheck} />
          </div>
          <div className="a-note">
            O‘z Pixel ID’si yozilmagan barcha landinglarda shu pixel ishlaydi.
          </div>
        </Integration>

        <Integration
          icon={<IconPlug size={22} />}
          tone="violet"
          title="Meta Conversions API"
          desc="Server orqali eventlar — reklama bloklovchilar va iOS cheklovlarini chetlab o‘tadi"
          connected={!!saved.meta_capi_token && !!saved.meta_pixel}
        >
          <div>
            <label className="a-lbl">Access token</label>
            <SecretInput
              value={form.meta_capi_token}
              onChange={(v) => {
                set('meta_capi_token', v);
                setCapiCheck(null);
              }}
              placeholder="EAAG…"
            />
          </div>
          <div className="a-row" style={{ margin: 0 }}>
            <button className="a-btn" type="button" disabled={checking === 'capi'} onClick={runCapiCheck}>
              {checking === 'capi' ? 'Tekshirilmoqda…' : 'Tokenni tekshirish'}
            </button>
            <Status check={capiCheck} />
          </div>
          <div className="a-note">
            Token: Events Manager → Pixel → Settings → Conversions API → Generate access token.
            Standart Pixel ID ham kiritilgan bo‘lishi kerak.
          </div>
        </Integration>
      </div>
    </div>
  );
}
