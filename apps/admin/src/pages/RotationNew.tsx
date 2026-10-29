import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { IconArrowLeft, IconCheck, IconX } from '../components/icons';
import { TemplateBadge, TemplatePicker } from '../components/TemplatePicker';
import { useToast } from '../components/ui';
import { accountLabel, getAccount } from '../lib/account';
import { api } from '../lib/api';
import { imgSrc, landingUrl, normSlug, templateLabel, type Landing } from '../lib/landings';
import { ROTATION_MODES, type RotationMode } from '../lib/rotations';

const slugify = (s: string) => normSlug(s.replace(/[‘’ʻʼ'`]/g, '')).replace(/^-|-$/g, '');

type Kind = 'templates' | 'landings';

const KINDS: { id: Kind; label: string; hint: string }[] = [
  {
    id: 'templates',
    label: 'Bitta mahsulot — har xil shablon',
    hint: 'Mahsulotni tanlaysiz, shablonlarni belgilaysiz — nusxalar avtomatik yaratiladi',
  },
  {
    id: 'landings',
    label: 'Tayyor landinglardan',
    hint: 'Allaqachon bor landinglarni bitta havolaga birlashtirasiz',
  },
];

function ProductCard({ l, on, multi, order, onClick }: { l: Landing; on: boolean; multi?: boolean; order?: number; onClick: () => void }) {
  return (
    <button type="button" className={on ? 'a-rn-card on' : 'a-rn-card'} aria-pressed={on} onClick={onClick}>
      <span className="a-rn-img">
        {l.content.images[0] ? <img src={imgSrc(l.content.images[0])} alt="" loading="lazy" /> : null}
        <span className={multi ? 'a-rn-check' : 'a-rn-check round'}>
          {on ? (order ? <b>{order}</b> : <IconCheck size={13} />) : null}
        </span>
        {!l.active ? <span className="a-rn-off">o‘chiq</span> : null}
      </span>
      <span className="a-rn-t">
        <b>{l.name}</b>
        <small>{l.path}</small>
      </span>
      <TemplateBadge t={l.template} label={templateLabel(l.template)} />
    </button>
  );
}

export default function RotationNew() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const account = getAccount();
  const [params] = useSearchParams();
  const [kind, setKind] = useState<Kind>('templates');
  const [mode, setMode] = useState<RotationMode>('visit');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [baseId, setBaseId] = useState('');
  const [templates, setTemplates] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    document.title = 'Yangi rotatsiya';
  }, []);

  const lq = useQuery({ queryKey: ['landings'], queryFn: () => api<Landing[]>('/api/admin/landings') });
  const all = lq.data || [];
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? all.filter((l) => `${l.name} ${l.path} ${l.offerId}`.toLowerCase().includes(needle)) : all;
  }, [all, q]);
  const base = all.find((l) => l.id === baseId);
  const extra = templates.filter((t) => t !== base?.template);
  const count = kind === 'templates' ? (base ? 1 + extra.length : 0) : picked.length;

  const pickedRows = useMemo(
    () => picked.map((id) => all.find((l) => l.id === id)).filter(Boolean) as Landing[],
    [picked, all],
  );
  const sameTemplate =
    kind === 'landings' && pickedRows.length >= 2 && new Set(pickedRows.map((l) => l.template)).size === 1;
  const inactive = kind === 'landings' ? pickedRows.filter((l) => !l.active) : [];

  function suggest(n: string, s: string) {
    if (!nameTouched) setName(n);
    if (!slugTouched) setSlug(s.slice(0, 40));
  }

  function pickBase(l: Landing) {
    setBaseId(l.id);
    suggest(`${l.name.replace(/ · [^·]+$/, '')} — A/B`, `${l.slug || 'bosh'}-ab`);
  }

  // Landinglar sahifasidagi "A/B test" tugmasidan kelganda mahsulot oldindan tanlanadi
  const preset = params.get('base');
  useEffect(() => {
    if (!preset || baseId) return;
    const l = all.find((x) => x.id === preset);
    if (l) pickBase(l);
  }, [preset, all]);

  const create = useMutation({
    mutationFn: () =>
      api<{ id: string }>('/api/admin/rotations', {
        method: 'POST',
        body: JSON.stringify(
          kind === 'templates'
            ? { name, slug, mode, baseLandingId: baseId, templates: extra }
            : { name, slug, mode, landingIds: picked },
        ),
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['rotations'] });
      qc.invalidateQueries({ queryKey: ['landings'] });
      toast.ok('Rotatsiya yaratildi');
      nav(`/rotations/${r.id}`, { replace: true });
    },
    onError: (e) => setErr(e instanceof Error ? e.message : 'Xatolik'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (kind === 'templates' && !base) return setErr('Mahsulot landingini tanlang');
    if (count < 2) return setErr(kind === 'templates' ? 'Kamida 1 ta boshqa shablon belgilang' : 'Kamida 2 ta landing tanlang');
    if (!name.trim()) return setErr('Nom kiriting');
    if (!slug) return setErr('URL manzilini kiriting');
    create.mutate();
  }

  const variants: { key: string; title: string; t: string; note?: string }[] =
    kind === 'templates'
      ? base
        ? [
            { key: base.id, title: templateLabel(base.template), t: base.template, note: 'asosiy landing' },
            ...extra.map((t) => ({ key: t, title: templateLabel(t), t, note: 'yangi nusxa' })),
          ]
        : []
      : pickedRows.map((l) => ({ key: l.id, title: l.name, t: l.template }));

  return (
    <form onSubmit={submit}>
      <div className="a-row" style={{ margin: '0 0 10px' }}>
        <Link className="a-btn sm" to="/rotations">
          <IconArrowLeft size={14} /> Rotatsiyalar
        </Link>
      </div>
      <h1 className="a-h1">Yangi rotatsiya · {accountLabel(account)}</h1>
      <p className="a-sub">
        Reklamaga bitta havola qo‘yasiz — ochilganda navbat bilan har xil variant ko‘rsatiladi va qaysi
        biri ko‘proq sotayotgani statistikada ko‘rinadi.
      </p>

      <div className="a-rn">
        <div className="a-rn-main">
          <div className="a-choice">
            {KINDS.map((k) => (
              <button key={k.id} type="button" className={kind === k.id ? 'on' : undefined} onClick={() => setKind(k.id)}>
                <strong>{k.label}</strong>
                <span>{k.hint}</span>
              </button>
            ))}
          </div>

          <section className="a-panel a-rn-sec">
            <div className="a-step">
              <b>1</b>
              {kind === 'templates' ? 'Mahsulot landingini tanlang' : `Landinglarni tanlang · ${picked.length} ta`}
              {kind === 'landings' && picked.length ? (
                <button className="a-btn sm" type="button" style={{ marginLeft: 'auto' }} onClick={() => setPicked([])}>
                  Tozalash
                </button>
              ) : null}
            </div>
            <input
              className="a-in"
              value={q}
              placeholder="Qidirish: nomi, manzil yoki offer…"
              onChange={(e) => setQ(e.target.value)}
            />
            {kind === 'landings' && sameTemplate ? (
              <div className="a-note warn" style={{ margin: '10px 0 0' }}>
                Tanlanganlarning hammasi “{templateLabel(pickedRows[0].template)}” shablonida — havola ochilganda
                dizayn o‘zgarmaydi. Har xil shablon kerak bo‘lsa, “Bitta mahsulot — har xil shablon”ni tanlang.
              </div>
            ) : null}
            {inactive.length ? (
              <div className="a-note warn" style={{ margin: '10px 0 0' }}>
                {inactive.map((l) => l.name).join(', ')} — o‘chiq landing, rotatsiyada ko‘rsatilmaydi.
              </div>
            ) : null}
            <div className="a-rn-grid">
              {lq.isLoading ? <p className="muted">Yuklanmoqda…</p> : null}
              {list.map((l) =>
                kind === 'templates' ? (
                  <ProductCard key={l.id} l={l} on={l.id === baseId} onClick={() => pickBase(l)} />
                ) : (
                  <ProductCard
                    key={l.id}
                    l={l}
                    multi
                    on={picked.includes(l.id)}
                    order={picked.indexOf(l.id) + 1 || undefined}
                    onClick={() =>
                      setPicked((p) => (p.includes(l.id) ? p.filter((x) => x !== l.id) : [...p, l.id]))
                    }
                  />
                ),
              )}
              {!lq.isLoading && !list.length ? <p className="muted">Landing topilmadi</p> : null}
            </div>
          </section>

          {kind === 'templates' ? (
            <section className="a-panel a-rn-sec">
              <div className="a-step">
                <b>2</b> Qaysi shablonlarda ko‘rsatilsin?
              </div>
              {base ? (
                <>
                  <TemplatePicker value={templates} onChange={setTemplates} locked={[base.template]} hidden={['reviews']} />
                  <div className="a-hint">
                    Har bir shablon uchun matn, rasm va market sozlamalari bir xil nusxa yaratiladi — faqat dizayn
                    farq qiladi. Nusxalarni keyin alohida tahrirlash mumkin.
                  </div>
                </>
              ) : (
                <div className="a-note" style={{ margin: 0 }}>
                  Avval yuqoridan mahsulot landingini tanlang.
                </div>
              )}
            </section>
          ) : null}
        </div>

        <aside className="a-panel a-rn-side">
          <div className="a-step">
            <b>{kind === 'templates' ? 3 : 2}</b> Havola va tartib
          </div>
          <div className="a-f">
            <div>
              <label className="a-lbl" htmlFor="rn">Nomi (faqat adminda)</label>
              <input
                id="rn"
                className="a-in"
                value={name}
                placeholder="Masalan: Atirlar — A/B"
                onChange={(e) => {
                  setNameTouched(true);
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value).slice(0, 40));
                }}
              />
            </div>
            <div>
              <label className="a-lbl" htmlFor="rs">Reklama havolasi</label>
              <div className="a-prefix">
                <span>{landingUrl('/').replace(/^https?:\/\//, '')}</span>
                <input
                  id="rs"
                  value={slug}
                  placeholder="atir-test"
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(normSlug(e.target.value));
                  }}
                />
              </div>
            </div>
            <div className="a-choice col">
              {ROTATION_MODES.map((m) => (
                <button key={m.id} type="button" className={mode === m.id ? 'on' : undefined} onClick={() => setMode(m.id)}>
                  <strong>{m.label}</strong>
                  <span>{m.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="a-rn-vars">
            <div className="a-lbl">Variantlar · {count}</div>
            {variants.length ? (
              <ol>
                {variants.map((v) => (
                  <li key={v.key}>
                    <TemplateBadge t={v.t} label={templateLabel(v.t)} />
                    <span>{kind === 'templates' ? v.note : v.title}</span>
                    {kind === 'landings' ? (
                      <button
                        type="button"
                        aria-label="Olib tashlash"
                        onClick={() => setPicked((p) => p.filter((x) => x !== v.key))}
                      >
                        <IconX size={12} />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>Hali variant tanlanmagan</p>
            )}
            {count === 1 ? (
              <p className="muted" style={{ margin: '6px 0 0', fontSize: 12.5 }}>Yana kamida 1 ta variant kerak</p>
            ) : null}
          </div>

          {err ? <div className="a-err" style={{ margin: 0 }}>{err}</div> : null}
          <button className="a-btn p a-rn-submit" type="submit" disabled={create.isPending || count < 2}>
            {create.isPending ? 'Yaratilmoqda…' : count >= 2 ? `Rotatsiyani yaratish · ${count} variant` : 'Rotatsiyani yaratish'}
          </button>
        </aside>
      </div>
    </form>
  );
}
