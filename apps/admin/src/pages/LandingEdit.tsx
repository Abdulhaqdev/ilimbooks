import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  IconArrowLeft,
  IconChevronDown,
  IconChevronUp,
  IconExternal,
  IconPlus,
  IconTrash,
  IconUpload,
  IconX,
} from '../components/icons';
import { PhonePreview } from '../components/PhonePreview';
import { api } from '../lib/api';
import { marketPanel, type Market } from '../lib/markets';
import {
  hasFeature,
  imgSrc,
  landingUrl,
  normSlug,
  TEMPLATES,
  uploadImage,
  type Faq,
  type Feature,
  type Landing,
  type LandingContent,
  type Review,
} from '../lib/landings';

type Tab = 'main' | 'content' | 'images' | 'benefits' | 'social' | 'extra' | 'form' | 'seo' | 'integrations';

const TABS: { id: Tab; label: string }[] = [
  { id: 'main', label: 'Asosiy' },
  { id: 'content', label: 'Matn va narx' },
  { id: 'images', label: 'Rasm va video' },
  { id: 'benefits', label: 'Afzalliklar' },
  { id: 'social', label: 'Sharhlar va FAQ' },
  { id: 'extra', label: 'Qo‘shimcha bloklar' },
  { id: 'form', label: 'Forma' },
  { id: 'seo', label: 'SEO' },
  { id: 'integrations', label: 'Pixel va ShoxMarket' },
];

function tabVisible(t: Tab, template: string) {
  if (t === 'benefits') return hasFeature(template, 'benefits');
  if (t === 'social') return hasFeature(template, 'reviews') || hasFeature(template, 'faq');
  if (t === 'extra') return ['bundle', 'problems', 'stock'].some((f) => hasFeature(template, f as Feature));
  return true;
}

const ACCENTS = ['#ff2e63', '#ffd400', '#10b981', '#2563eb', '#d4af37', '#ff7a59', '#0f766e', '#7c3aed', '#111827'];
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="a-lbl">{label}</label>
      {children}
      {hint ? <div className="a-hint">{hint}</div> : null}
    </div>
  );
}

function move<T>(list: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = list.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function StringList({
  value,
  onChange,
  placeholder,
  addLabel,
  max = 8,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  addLabel: string;
  max?: number;
}) {
  return (
    <div className="a-list">
      {value.map((v, i) => (
        <div className="a-list-row" key={i}>
          <input
            className="a-in"
            value={v}
            placeholder={placeholder}
            onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <button className="a-icon-btn" type="button" title="Yuqoriga" onClick={() => onChange(move(value, i, -1))}>
            <IconChevronUp size={16} />
          </button>
          <button className="a-icon-btn" type="button" title="Pastga" onClick={() => onChange(move(value, i, 1))}>
            <IconChevronDown size={16} />
          </button>
          <button
            className="a-icon-btn danger"
            type="button"
            title="O‘chirish"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <IconX size={16} />
          </button>
        </div>
      ))}
      {value.length < max ? (
        <button className="a-btn sm" type="button" onClick={() => onChange([...value, ''])}>
          <IconPlus size={14} /> {addLabel}
        </button>
      ) : null}
    </div>
  );
}

function ImagesEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [url, setUrl] = useState('');

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setErr('');
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, 12 - value.length)) {
        urls.push(await uploadImage(f));
      }
      onChange([...value, ...urls]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Rasm yuklanmadi');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div>
      <div className="a-imgs">
        {value.map((src, i) => (
          <div className="a-img" key={`${src}-${i}`}>
            <img src={imgSrc(src)} alt="" />
            {i === 0 ? <span className="a-img-main">Asosiy</span> : null}
            <div className="a-img-tools">
              <button type="button" title="Chapga" onClick={() => onChange(move(value, i, -1))}>
                <IconChevronUp size={14} />
              </button>
              <button type="button" title="O‘ngga" onClick={() => onChange(move(value, i, 1))}>
                <IconChevronDown size={14} />
              </button>
              <button
                type="button"
                className="danger"
                title="O‘chirish"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                <IconTrash size={14} />
              </button>
            </div>
          </div>
        ))}
        {value.length < 12 ? (
          <button
            className="a-img-add"
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <IconUpload size={22} />
            <span>{busy ? 'Yuklanmoqda…' : 'Rasm yuklash'}</span>
            <small>JPG, PNG, WEBP · 5 MB gacha</small>
          </button>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      {err ? <div className="a-err" style={{ marginTop: 12 }}>{err}</div> : null}
      <div className="a-row" style={{ marginTop: 14, marginBottom: 0 }}>
        <input
          className="a-in"
          style={{ flex: 1 }}
          placeholder="yoki rasm havolasi: https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          className="a-btn"
          type="button"
          disabled={!/^https:\/\//.test(url.trim())}
          onClick={() => {
            onChange([...value, url.trim()]);
            setUrl('');
          }}
        >
          Qo‘shish
        </button>
      </div>
      <div className="a-hint">
        Birinchi rasm — asosiy (kompakt shablonda faqat shu ko‘rinadi). Tartibni strelkalar bilan
        o‘zgartiring.
      </div>
    </div>
  );
}

function RowTools({ onUp, onDown, onDelete }: { onUp: () => void; onDown: () => void; onDelete: () => void }) {
  return (
    <div className="a-benefit-tools">
      <button className="a-icon-btn" type="button" title="Yuqoriga" onClick={onUp}>
        <IconChevronUp size={16} />
      </button>
      <button className="a-icon-btn" type="button" title="Pastga" onClick={onDown}>
        <IconChevronDown size={16} />
      </button>
      <button className="a-icon-btn danger" type="button" title="O‘chirish" onClick={onDelete}>
        <IconTrash size={16} />
      </button>
    </div>
  );
}

function ReviewsEditor({ value, onChange }: { value: Review[]; onChange: (v: Review[]) => void }) {
  const upd = (i: number, patch: Partial<Review>) => onChange(value.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="a-benefits">
      {value.map((r, i) => (
        <div className="a-benefit plain" key={i}>
          <div className="a-benefit-body">
            <div className="a-grid-3">
              <input className="a-in" value={r.name} placeholder="Ism" onChange={(e) => upd(i, { name: e.target.value })} />
              <input className="a-in" value={r.city} placeholder="Shahar" onChange={(e) => upd(i, { city: e.target.value })} />
              <select className="a-in" value={r.rating} onChange={(e) => upd(i, { rating: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {'★'.repeat(n)}
                  </option>
                ))}
              </select>
            </div>
            <textarea className="a-in" rows={2} value={r.text} placeholder="Mijoz fikri" onChange={(e) => upd(i, { text: e.target.value })} />
          </div>
          <RowTools
            onUp={() => onChange(move(value, i, -1))}
            onDown={() => onChange(move(value, i, 1))}
            onDelete={() => onChange(value.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      {value.length < 12 ? (
        <button className="a-btn" type="button" onClick={() => onChange([...value, { name: '', city: '', text: '', rating: 5 }])}>
          <IconPlus size={16} /> Sharh qo‘shish
        </button>
      ) : null}
    </div>
  );
}

function FaqEditor({ value, onChange }: { value: Faq[]; onChange: (v: Faq[]) => void }) {
  const upd = (i: number, patch: Partial<Faq>) => onChange(value.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="a-benefits">
      {value.map((f, i) => (
        <div className="a-benefit plain" key={i}>
          <div className="a-benefit-body">
            <input className="a-in" value={f.q} placeholder="Savol" onChange={(e) => upd(i, { q: e.target.value })} />
            <textarea className="a-in" rows={2} value={f.a} placeholder="Javob" onChange={(e) => upd(i, { a: e.target.value })} />
          </div>
          <RowTools
            onUp={() => onChange(move(value, i, -1))}
            onDown={() => onChange(move(value, i, 1))}
            onDelete={() => onChange(value.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      {value.length < 10 ? (
        <button className="a-btn" type="button" onClick={() => onChange([...value, { q: '', a: '' }])}>
          <IconPlus size={16} /> Savol qo‘shish
        </button>
      ) : null}
    </div>
  );
}

function VideoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onFile(f?: File) {
    if (!f) return;
    setErr('');
    setBusy(true);
    try {
      onChange(await uploadImage(f));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Video yuklanmadi');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div>
      {value ? (
        <div className="a-video">
          <video src={imgSrc(value)} muted playsInline controls preload="metadata" />
          <button className="a-btn sm danger" type="button" onClick={() => onChange('')}>
            <IconTrash size={14} /> Videoni olib tashlash
          </button>
        </div>
      ) : null}
      <div className="a-row" style={{ marginBottom: 0 }}>
        <button className="a-btn" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
          <IconUpload size={16} /> {busy ? 'Yuklanmoqda…' : value ? 'Boshqa video' : 'Video yuklash'}
        </button>
        <input
          className="a-in"
          style={{ flex: 1 }}
          placeholder="yoki havola: https://….mp4"
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
        />
      </div>
      <input ref={fileRef} type="file" accept="video/mp4,video/webm" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {err ? <div className="a-err" style={{ marginTop: 10 }}>{err}</div> : null}
      <div className="a-hint">
        MP4 · 25 MB gacha, vertikal (9:16) va 15–30 soniya tavsiya etiladi. Ovozsiz avtomatik o‘ynaydi — Instagram’dan kelganlar
        uchun eng kuchli birinchi ekran.
      </div>
    </div>
  );
}

export default function LandingEdit() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['landing', id],
    queryFn: () => api<Landing>(`/api/admin/landings/${id}`),
  });
  const mq = useQuery({
    queryKey: ['markets'],
    queryFn: () => api<Market[]>('/api/admin/markets'),
  });
  const [draft, setDraft] = useState<Landing | null>(null);
  const [tab, setTab] = useState<Tab>('main');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (q.data) setDraft(q.data);
  }, [q.data]);

  useEffect(() => {
    document.title = draft ? `${draft.name} — tahrirlash` : 'Landing';
  }, [draft?.name]);

  const dirty = useMemo(
    () => !!draft && !!q.data && JSON.stringify(draft) !== JSON.stringify(q.data),
    [draft, q.data],
  );

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener('beforeunload', onLeave);
    return () => removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  const previewLanding = useMemo(
    () => (draft ? { path: draft.path, template: draft.template, content: draft.content } : null),
    [draft],
  );

  const save = useMutation({
    mutationFn: (d: Landing) =>
      api<Landing>(`/api/admin/landings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: d.name,
          slug: d.slug,
          template: d.template,
          active: d.active,
          content: d.content,
          pixelId: d.pixelId,
          marketId: d.marketId,
          stream: d.stream,
          offerId: d.offerId,
        }),
      }),
    onSuccess: (saved) => {
      qc.setQueryData(['landing', id], saved);
      qc.invalidateQueries({ queryKey: ['landings'] });
      setDraft(saved);
      setMsg({ ok: true, text: 'Saqlandi' });
      setTimeout(() => setMsg(null), 2200);
    },
    onError: (e) => setMsg({ ok: false, text: e instanceof Error ? e.message : 'Xatolik' }),
  });

  if (q.isLoading || !draft) {
    return <p className="muted">{q.isError ? 'Landing topilmadi' : 'Yuklanmoqda…'}</p>;
  }

  const c = draft.content;
  const markets = mq.data || [];
  const curMarket = markets.find((m) => m.id === draft.marketId) || markets[0];
  const panelUrl = curMarket ? marketPanel(curMarket.code) : '';
  const curTab: Tab = tabVisible(tab, draft.template) ? tab : 'main';
  const has = (f: Feature) => hasFeature(draft.template, f);
  const set = <K extends keyof Landing>(k: K, v: Landing[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const setC = <K extends keyof LandingContent>(k: K, v: LandingContent[K]) =>
    setDraft((d) => (d ? { ...d, content: { ...d.content, [k]: v } } : d));
  const text = (k: keyof LandingContent, placeholder?: string) => (
    <input
      className="a-in"
      value={c[k] as string}
      placeholder={placeholder}
      onChange={(e) => setC(k, e.target.value as never)}
    />
  );
  const area = (k: keyof LandingContent, rows = 3) => (
    <textarea
      className="a-in"
      rows={rows}
      value={c[k] as string}
      onChange={(e) => setC(k, e.target.value as never)}
    />
  );

  return (
    <div className="a-editor">
      <div className="a-ed-head">
        <div className="a-ed-title">
          <Link to="/landings" className="a-icon-btn" title="Landinglar">
            <IconArrowLeft size={18} />
          </Link>
          <div style={{ minWidth: 0 }}>
            <h1>{draft.name || 'Nomsiz landing'}</h1>
            <a href={landingUrl(q.data!.path)} target="_blank" rel="noreferrer" className="a-lurl">
              {landingUrl(q.data!.path).replace(/^https?:\/\//, '')} <IconExternal size={12} />
            </a>
          </div>
        </div>
        <div className="a-ed-actions">
          <span className={draft.active ? 'a-pill ok' : 'a-pill bad'}>
            {draft.active ? 'Faol' : 'O‘chiq'}
          </span>
          {msg ? (
            <span className={msg.ok ? 'a-save-msg ok' : 'a-save-msg bad'}>{msg.text}</span>
          ) : dirty ? (
            <span className="a-save-msg">Saqlanmagan o‘zgarishlar</span>
          ) : null}
          <button className="a-btn" type="button" disabled={!dirty} onClick={() => setDraft(q.data!)}>
            Bekor qilish
          </button>
          <button
            className="a-btn p"
            type="button"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate(draft)}
          >
            {save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </div>
      </div>

      <div className="a-ed-body">
        <div className="a-ed-form">
          <div className="a-tabs">
            {TABS.filter((t) => tabVisible(t.id, draft.template)).map((t) => (
              <button
                key={t.id}
                type="button"
                className={curTab === t.id ? 'on' : undefined}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="a-panel">
            <div className="a-panel-b a-f">
              {curTab === 'main' ? (
                <>
                  <Field label="Landing nomi" hint="Faqat admin panelda ko‘rinadi">
                    <input className="a-in" value={draft.name} onChange={(e) => set('name', e.target.value)} />
                  </Field>
                  <Field
                    label="URL manzil"
                    hint={draft.slug === '' ? 'Bo‘sh — bu bosh sahifa (/)' : 'Faqat lotin harflari, raqam va "-"'}
                  >
                    <div className="a-prefix">
                      <span>{landingUrl('/').replace(/^https?:\/\//, '')}</span>
                      <input
                        value={draft.slug}
                        placeholder="(bosh sahifa)"
                        onChange={(e) => set('slug', normSlug(e.target.value))}
                      />
                    </div>
                  </Field>
                  <Field label="Shablon">
                    <div className="a-choice">
                      {TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={draft.template === t.id ? 'on' : undefined}
                          onClick={() => set('template', t.id)}
                        >
                          <strong>{t.label}</strong>
                          <span>{t.hint}</span>
                        </button>
                      ))}
                    </div>
                  </Field>
                  <label className="a-switch-row">
                    <span>
                      <strong>Landing faol</strong>
                      <small>O‘chiq landing saytda “Sahifa topilmadi” ko‘rsatadi</small>
                    </span>
                    <span className="a-toggle">
                      <input type="checkbox" checked={draft.active} onChange={(e) => set('active', e.target.checked)} />
                      <span />
                    </span>
                  </label>
                  <Field label="Brend nomi" hint="Sarlavha va footer’da ko‘rinadi">
                    {text('brand')}
                  </Field>
                  {has('accent') ? (
                    <Field label="Asosiy rang" hint="Tugmalar va urg‘ular rangi. Bo‘sh — shablonning o‘z rangi">
                      <div className="a-swatches">
                        <button
                          type="button"
                          className={!c.accent ? 'on auto' : 'auto'}
                          onClick={() => setC('accent', '')}
                          title="Shablon rangi"
                        >
                          Auto
                        </button>
                        {ACCENTS.map((col) => (
                          <button
                            key={col}
                            type="button"
                            className={c.accent.toLowerCase() === col ? 'on' : undefined}
                            style={{ background: col }}
                            onClick={() => setC('accent', col)}
                            title={col}
                          />
                        ))}
                        <input
                          type="color"
                          value={c.accent || '#7c3aed'}
                          onChange={(e) => setC('accent', e.target.value)}
                          title="Boshqa rang"
                        />
                      </div>
                    </Field>
                  ) : null}
                </>
              ) : null}

              {curTab === 'content' ? (
                <>
                  <Field label="Sarlavha (mahsulot nomi)">{text('title')}</Field>
                  <Field label="Qisqa tavsif">{area('subtitle', 2)}</Field>
                  <div className="a-grid-2">
                    <Field label="Asl narxi" hint="Chizilgan narx. Bo‘sh — chegirma ko‘rsatilmaydi">
                      {text('priceOld', '279 000')}
                    </Field>
                    <Field label="Aksiya narxi">{text('priceNew', '169 000')}</Field>
                  </div>
                  <div className="a-grid-2">
                    <Field label="Valyuta">{text('currency', 'so‘m')}</Field>
                    <Field label="Reyting">{text('rating', '4.9')}</Field>
                  </div>
                  <Field label="Mijozlar soni" hint="Masalan: 4 500+">
                    {text('reviewsCount')}
                  </Field>
                  <Field label="Taymer yozuvi" hint="“… tugashiga:” oldidan chiqadi">
                    {text('timerLabel')}
                  </Field>
                  <Field label="Shoshilinch matn (taymer ostida)">{area('urgency', 2)}</Field>
                  {has('marquee') ? (
                    <Field label="Yuguruvchi qator (eng tepada)" hint="Bo‘sh qoldirsangiz ko‘rinmaydi">
                      {text('marquee')}
                    </Field>
                  ) : null}
                  {has('hitBadge') ? (
                    <Field label="Belgi (badge)" hint="Masalan: 🔥 HIT yoki 26 000+ sotildi. Bo‘sh — ko‘rinmaydi">
                      {text('hitBadge')}
                    </Field>
                  ) : null}
                  {has('chips') ? (
                    <Field label="Chiplar (qisqa afzalliklar)">
                      <StringList
                        value={c.chips}
                        onChange={(v) => setC('chips', v)}
                        placeholder="✅ Kafolatli"
                        addLabel="Chip qo‘shish"
                      />
                    </Field>
                  ) : null}
                  {has('guarantee') ? (
                    <>
                      <Field label="Kafolat bloki — sarlavha" hint="Bo‘sh — blok ko‘rinmaydi">
                        {text('guaranteeTitle')}
                      </Field>
                      <Field label="Kafolat bloki — matn">{area('guaranteeText', 2)}</Field>
                    </>
                  ) : null}
                  {has('footer') ? <Field label="Footer matni">{text('footerText')}</Field> : null}
                </>
              ) : null}

              {curTab === 'images' ? (
                <>
                  <ImagesEditor value={c.images} onChange={(v) => setC('images', v)} />
                  {has('video') ? (
                    <Field label="Video (birinchi ekran)">
                      <VideoField value={c.videoUrl} onChange={(v) => setC('videoUrl', v)} />
                    </Field>
                  ) : null}
                </>
              ) : null}

              {curTab === 'social' ? (
                <>
                  {has('reviews') ? (
                    <Field label="Mijozlar sharhlari" hint="Haqiqiy mijozlar fikrini yozing — ishonchni eng ko‘p oshiradigan blok">
                      <ReviewsEditor value={c.reviews} onChange={(v) => setC('reviews', v)} />
                    </Field>
                  ) : null}
                  {has('faq') ? (
                    <Field label="Savol-javob (FAQ)" hint="Operatorga eng ko‘p beriladigan savollar — e’tirozlarni oldindan yopadi">
                      <FaqEditor value={c.faq} onChange={(v) => setC('faq', v)} />
                    </Field>
                  ) : null}
                </>
              ) : null}

              {curTab === 'extra' ? (
                <>
                  {has('problems') ? (
                    <>
                      <Field label="Muammo bloki — sarlavha">{text('problemTitle', 'Sizda ham shunday bo‘ladimi?')}</Field>
                      <Field label="Muammolar ro‘yxati" hint="Mijozning og‘riq nuqtalari — qisqa va aniq">
                        <StringList
                          value={c.problems}
                          onChange={(v) => setC('problems', v)}
                          placeholder="Kun oxirida bel og‘riydi"
                          addLabel="Muammo qo‘shish"
                          max={10}
                        />
                      </Field>
                    </>
                  ) : null}
                  {has('bundle') ? (
                    <Field label="To‘plam / komplekt tarkibi" hint="Qutida nimalar borligi">
                      <StringList
                        value={c.bundle}
                        onChange={(v) => setC('bundle', v)}
                        placeholder="Zaryadlovchi qurilma"
                        addLabel="Element qo‘shish"
                        max={10}
                      />
                    </Field>
                  ) : null}
                  {has('stock') ? (
                    <Field label="Omborda qoldi (dona)" hint="Masalan: 17. Bo‘sh — ko‘rinmaydi">
                      <input
                        className="a-in"
                        inputMode="numeric"
                        value={c.stockLeft}
                        placeholder="17"
                        onChange={(e) => setC('stockLeft', e.target.value.replace(/\D/g, '').slice(0, 5))}
                      />
                    </Field>
                  ) : null}
                </>
              ) : null}

              {curTab === 'benefits' ? (
                <>
                  <Field label="Bo‘lim sarlavhasi">{text('benefitsTitle')}</Field>
                  <div className="a-benefits">
                    {c.benefits.map((b, i) => (
                      <div className="a-benefit" key={i}>
                        <input
                          className="a-in a-benefit-icon"
                          value={b.icon}
                          maxLength={4}
                          placeholder="✨"
                          onChange={(e) =>
                            setC('benefits', c.benefits.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))
                          }
                        />
                        <div className="a-benefit-body">
                          <input
                            className="a-in"
                            value={b.title}
                            placeholder="Sarlavha"
                            onChange={(e) =>
                              setC('benefits', c.benefits.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                            }
                          />
                          <textarea
                            className="a-in"
                            rows={2}
                            value={b.text}
                            placeholder="Qisqa izoh"
                            onChange={(e) =>
                              setC('benefits', c.benefits.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
                            }
                          />
                        </div>
                        <div className="a-benefit-tools">
                          <button className="a-icon-btn" type="button" onClick={() => setC('benefits', move(c.benefits, i, -1))}>
                            <IconChevronUp size={16} />
                          </button>
                          <button className="a-icon-btn" type="button" onClick={() => setC('benefits', move(c.benefits, i, 1))}>
                            <IconChevronDown size={16} />
                          </button>
                          <button
                            className="a-icon-btn danger"
                            type="button"
                            onClick={() => setC('benefits', c.benefits.filter((_, j) => j !== i))}
                          >
                            <IconTrash size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {c.benefits.length < 12 ? (
                    <button
                      className="a-btn"
                      type="button"
                      onClick={() => setC('benefits', [...c.benefits, { icon: '✨', title: '', text: '' }])}
                    >
                      <IconPlus size={16} /> Afzallik qo‘shish
                    </button>
                  ) : null}
                </>
              ) : null}

              {curTab === 'form' ? (
                <>
                  {has('formText') ? (
                    <>
                      <Field label="Forma sarlavhasi">{text('formTitle')}</Field>
                      <Field label="Forma izohi">{text('formSubtitle')}</Field>
                    </>
                  ) : null}
                  <Field label="Tugma matni">{text('ctaText')}</Field>
                  <Field label="Ishonch belgilari (tugma ostida)">
                    <StringList
                      value={c.trust}
                      onChange={(v) => setC('trust', v)}
                      placeholder="🔒 Xavfsiz"
                      addLabel="Belgi qo‘shish"
                    />
                  </Field>
                  <Field label="Muvaffaqiyat — sarlavha" hint="Buyurtma yuborilgandan keyin chiqadi">
                    {text('successTitle')}
                  </Field>
                  <Field label="Muvaffaqiyat — matn">{area('successText', 2)}</Field>
                </>
              ) : null}

              {curTab === 'seo' ? (
                <>
                  <Field label="Sahifa sarlavhasi (title)" hint="Brauzer tabida va Google’da ko‘rinadi">
                    {text('seoTitle')}
                  </Field>
                  <Field label="Tavsif (description)" hint="Google natijalarida sarlavha ostida chiqadi">
                    {area('seoDescription', 3)}
                  </Field>
                </>
              ) : null}

              {curTab === 'integrations' ? (
                <>
                  <Field
                    label="Meta Pixel ID"
                    hint="Bo‘sh qoldirsangiz Sozlamalar’dagi standart Pixel ishlaydi. Bir nechta ID — vergul bilan."
                  >
                    <input
                      className="a-in"
                      value={draft.pixelId}
                      placeholder="879714067250592"
                      onChange={(e) => set('pixelId', e.target.value)}
                    />
                  </Field>
                  <Field label="Market" hint="Buyurtma qaysi CPA tizimiga uzatiladi">
                    <select
                      className="a-in"
                      value={draft.marketId ?? ''}
                      onChange={(e) => set('marketId', e.target.value || null)}
                    >
                      <option value="">— standart market —</option>
                      {markets.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                          {m.hasApiKey ? '' : ' (kalit yo‘q)'}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="a-grid-2">
                    <Field label="Oqim (stream kaliti)" hint="Market panelida offer uchun yaratiladi. Bo‘sh — market standarti">
                      <input
                        className="a-in"
                        value={draft.stream}
                        placeholder={curMarket?.defaultStream || 'aM4LiY1C'}
                        onChange={(e) => set('stream', e.target.value)}
                      />
                    </Field>
                    <Field label="offer_id (mahsulot raqami)" hint="Bo‘sh — market standarti">
                      <input
                        className="a-in"
                        value={draft.offerId}
                        placeholder={curMarket?.defaultOfferId || '1'}
                        onChange={(e) => set('offerId', e.target.value)}
                      />
                    </Field>
                  </div>
                  {!draft.stream && !curMarket?.defaultStream ? (
                    <div className="a-err">
                      Oqim kiritilmagan — buyurtma bazada saqlanadi, lekin marketga uzatilmaydi.
                      {panelUrl ? (
                        <>
                          {' '}
                          <a className="a-link" href={panelUrl} target="_blank" rel="noreferrer">
                            {curMarket?.name} panelida
                          </a>{' '}
                          shu offer uchun oqim yaratib, kalitini shu yerga qo‘ying.
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="a-note">
                    Har bir mahsulot uchun alohida oqim bering — buyurtmalar market statistikasida
                    shunga qarab ajraladi. API kaliti{' '}
                    <Link to="/markets" className="a-link">Marketlar</Link> sahifasida.
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="a-ed-preview">
          <PhonePreview url={landingUrl(draft.path)} landing={previewLanding} />
        </div>
      </div>
    </div>
  );
}
