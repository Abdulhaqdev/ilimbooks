import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CreateLandingModal } from '../components/CreateLandingModal';
import {
  IconArrowLeft,
  IconCheck,
  IconExternal,
  IconEye,
  IconLayout,
  IconSparkles,
  IconX,
} from '../components/icons';
import { PhonePreview } from '../components/PhonePreview';
import { Select } from '../components/Select';
import { accountLabel, getAccount } from '../lib/account';
import { api } from '../lib/api';
import { hasFeature, imgSrc, landingUrl, templateLabel, type Feature, type Preset } from '../lib/landings';
import { marketName, marketPanel, type Market } from '../lib/markets';

const TONE: Record<string, string> = {
  full: '#0f6b4f',
  compact: '#16a06f',
  story: '#e1306c',
  flash: '#f5b301',
  problem: '#10b981',
  reviews: '#2563eb',
  premium: '#c9a227',
  kids: '#ff7a59',
  bundle: '#0f766e',
  minimal: '#7c3aed',
};

const BLOCKS: { f: Feature; label: string }[] = [
  { f: 'video', label: 'To‘liq ekranli video' },
  { f: 'problems', label: 'Muammo bloki' },
  { f: 'bundle', label: 'To‘plam tarkibi' },
  { f: 'stock', label: 'Qoldiq hisoblagichi' },
  { f: 'benefits', label: 'Afzalliklar' },
  { f: 'reviews', label: 'Mijozlar sharhlari' },
  { f: 'faq', label: 'Savol-javob' },
  { f: 'guarantee', label: 'Kafolat bloki' },
  { f: 'accent', label: 'Rangni o‘zgartirish' },
];

type Sort = 'default' | 'payout' | 'price-asc' | 'price-desc' | 'name';

const SORTS: { id: Sort; label: string }[] = [
  { id: 'default', label: 'Standart tartib' },
  { id: 'payout', label: 'To‘lovi ko‘p' },
  { id: 'price-asc', label: 'Narxi arzon' },
  { id: 'price-desc', label: 'Narxi qimmat' },
  { id: 'name', label: 'Nomi (A→Z)' },
];

const num = (s: string) => Number(String(s || '').replace(/\D/g, '')) || 0;

/** Qidiruv uchun: apostroflar, registr va ortiqcha belgilarni tekislaydi. */
function norm(s: string) {
  return String(s || '')
    .toLowerCase()
    .replace(/[‘’ʻʼ`']/g, '')
    .replace(/[^a-z0-9а-яё\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matches(p: Preset, q: string) {
  if (!q) return true;
  const hay = norm(
    [p.product, p.name, p.goal, p.category, p.content.title, p.content.subtitle, p.offerId, ...p.tags]
      .filter(Boolean)
      .join(' '),
  );
  return norm(q)
    .split(' ')
    .every((w) => hay.includes(w));
}

function PreviewModal({
  preset,
  marketLabel,
  onClose,
  onUse,
}: {
  preset: Preset;
  marketLabel: string;
  onClose: () => void;
  onUse: () => void;
}) {
  const landing = useMemo(() => ({ path: '/', template: preset.template, content: preset.content }), [preset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="a-modal-back" onClick={onClose}>
      <div className="a-modal a-tpl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="a-tpl-info">
          <div className="a-modal-h">
            <span className="a-tpl-kind" style={{ background: TONE[preset.template] }}>
              {templateLabel(preset.template)}
            </span>
            <button className="a-icon-btn" type="button" onClick={onClose} aria-label="Yopish">
              <IconX />
            </button>
          </div>
          <h2>{preset.product}</h2>
          <p className="muted">{preset.goal}</p>

          <div className="a-tpl-facts">
            <div>
              <span>Narx</span>
              <b>
                {preset.content.priceNew} {preset.content.currency}
                {preset.content.priceOld ? <s>{preset.content.priceOld}</s> : null}
              </b>
            </div>
            {preset.payout ? (
              <div>
                <span>Lead uchun to‘lov</span>
                <b className="c-green">{preset.payout} so‘m</b>
              </div>
            ) : null}
            <div>
              <span>Kategoriya</span>
              <b>{preset.category}</b>
            </div>
            <div>
              <span>Manba</span>
              <a href={preset.sourceUrl} target="_blank" rel="noreferrer" className="a-link">
                {preset.source} <IconExternal size={12} />
              </a>
            </div>
          </div>

          <div className="a-lbl" style={{ marginTop: 18 }}>
            Sahifadagi bloklar
          </div>
          <ul className="a-tpl-blocks">
            {BLOCKS.filter((b) => hasFeature(preset.template, b.f)).map((b) => (
              <li key={b.f}>
                <IconCheck size={14} /> {b.label}
              </li>
            ))}
            <li>
              <IconCheck size={14} /> Buyurtma formasi (ism + telefon)
            </li>
          </ul>

          {preset.offerId ? (
            <div className="a-note" style={{ marginTop: 16 }}>
              Buyurtmalar {marketLabel || preset.source}’dagi #{preset.offerId} mahsulotga yuboriladi.
              Oqim (stream) kalitini landing yaratilgach Integratsiya bo‘limida kiritasiz.
            </div>
          ) : (
            <div className="a-note" style={{ marginTop: 16 }}>
              Sharhlar, mijozlar soni va qoldiq — namunaviy. Ishga tushirishdan oldin haqiqiy
              ma’lumotlar bilan almashtiring.
            </div>
          )}

          <button className="a-btn p a-tpl-use" type="button" onClick={onUse}>
            <IconSparkles size={16} /> Shu shablondan landing yaratish
          </button>
        </div>
        <div className="a-tpl-phone">
          <PhonePreview url={landingUrl('/')} landing={landing} />
        </div>
      </div>
    </div>
  );
}

/** 1-qadam: market panellari. Har market o'z katalogiga ega. */
function MarketPicker({ presets, markets }: { presets: Preset[]; markets: Market[] }) {
  const account = getAccount();
  const groups = useMemo(() => {
    const by = new Map<string, Preset[]>();
    for (const p of presets) {
      const code = p.marketCode || p.source;
      if (!by.has(code)) by.set(code, []);
      by.get(code)!.push(p);
    }
    return [...by.entries()]
      .map(([code, rows]) => ({
        code,
        rows,
        market: markets.find((m) => m.code === code) || null,
        cats: [...new Set(rows.map((r) => r.category))],
        source: rows[0]?.source || code,
      }))
      .sort((a, b) => Number(!!b.market) - Number(!!a.market));
  }, [presets, markets]);

  return (
    <div>
      <h1 className="a-h1">Tayyor shablonlar · {accountLabel(account)}</h1>
      <p className="a-sub">
        Har market o‘z katalogi bilan. Katalogni oching, mahsulotni tanlang — landing shu
        marketning offer raqami bilan tayyor bo‘ladi.
      </p>

      <div className="a-mkt-grid">
        {groups.map((g) => {
          const inAccount = !!g.market;
          return (
            <div className={inAccount ? 'a-panel a-mkt' : 'a-panel a-mkt off'} key={g.code}>
              <div className="a-mkt-h">
                <div className="a-int-ic green">
                  <IconLayout size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="a-int-title">{g.market?.name || marketName(g.code, g.source)}</div>
                  <div className="a-int-desc">{g.source}</div>
                </div>
                <b className="a-mkt-count">{g.rows.length}</b>
              </div>
              <div className="a-mkt-cats">
                {g.cats.slice(0, 6).map((c) => (
                  <span key={c}>{c}</span>
                ))}
                {g.cats.length > 6 ? <span>+{g.cats.length - 6}</span> : null}
              </div>
              {inAccount ? (
                <Link className="a-btn p a-mkt-go" to={`/templates/${g.code}`}>
                  <IconSparkles size={16} /> Katalogni ochish
                </Link>
              ) : (
                <div className="a-note" style={{ margin: 0 }}>
                  Bu akkauntda “{marketName(g.code, g.source)}” marketi yo‘q.{' '}
                  <Link className="a-link" to="/markets">
                    Marketlar
                  </Link>{' '}
                  sahifasida qo‘shing yoki tegishli akkauntga o‘ting.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 2-qadam: tanlangan market katalogi — qidiruv, filtr, saralash. */
function MarketCatalog({ code, presets, market }: { code: string; presets: Preset[]; market: Market | null }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [tpl, setTpl] = useState('');
  const [sort, setSort] = useState<Sort>('default');
  const [preview, setPreview] = useState<Preset | null>(null);
  const [using, setUsing] = useState<Preset | null>(null);

  const all = useMemo(() => presets.filter((p) => (p.marketCode || p.source) === code), [presets, code]);
  const name = market?.name || marketName(code, all[0]?.source || '');

  useEffect(() => {
    document.title = `${name} — shablonlar`;
  }, [name]);

  const cats = useMemo(() => [...new Set(all.map((p) => p.category))].sort(), [all]);
  const tpls = useMemo(() => [...new Set(all.map((p) => p.template))], [all]);

  const list = useMemo(() => {
    const rows = all.filter(
      (p) => (!cat || p.category === cat) && (!tpl || p.template === tpl) && matches(p, q),
    );
    const sorted = [...rows];
    if (sort === 'payout') sorted.sort((a, b) => num(b.payout || '') - num(a.payout || ''));
    if (sort === 'price-asc') sorted.sort((a, b) => num(a.content.priceNew) - num(b.content.priceNew));
    if (sort === 'price-desc') sorted.sort((a, b) => num(b.content.priceNew) - num(a.content.priceNew));
    if (sort === 'name') sorted.sort((a, b) => a.product.localeCompare(b.product, 'uz'));
    return sorted;
  }, [all, cat, tpl, q, sort]);

  const filtered = !!q || !!cat || !!tpl || sort !== 'default';

  function reset() {
    setQ('');
    setCat('');
    setTpl('');
    setSort('default');
  }

  if (!all.length) {
    return (
      <div>
        <button className="a-btn sm" type="button" onClick={() => nav('/templates')}>
          <IconArrowLeft size={14} /> Marketlar
        </button>
        <p className="muted" style={{ marginTop: 16 }}>
          Bu market uchun katalog yo‘q.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="a-row spread" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="a-row" style={{ margin: '0 0 6px' }}>
            <Link className="a-btn sm" to="/templates">
              <IconArrowLeft size={14} /> Marketlar
            </Link>
          </div>
          <h1 className="a-h1" style={{ marginBottom: 4 }}>
            {name} katalogi
          </h1>
          <p className="a-sub" style={{ marginBottom: 0 }}>
            {all.length} ta mahsulot · {cats.length} kategoriya. Shablonni tanlang, matn va
            rasmlarni o‘zgartirib ishga tushiring.
          </p>
        </div>
        {marketPanel(code) ? (
          <a className="a-btn" href={marketPanel(code)} target="_blank" rel="noreferrer">
            <IconExternal size={14} /> Market paneli
          </a>
        ) : null}
      </div>

      {!market ? (
        <div className="a-err" style={{ marginTop: 14 }}>
          Bu katalog <b>{name}</b> marketiga tegishli, lekin hozirgi akkauntda ({accountLabel(getAccount())})
          bunday market yo‘q — shablondan landing yaratib bo‘lmaydi. Yuqoridan tegishli akkauntni
          tanlang yoki <Link className="a-link" to="/markets">Marketlar</Link> sahifasida qo‘shing.
        </div>
      ) : null}

      <div className="a-tbar">
        <div className="a-search">
          <input
            className="a-in"
            value={q}
            placeholder="Qidirish: nomi, kategoriya yoki offer raqami…"
            onChange={(e) => setQ(e.target.value)}
          />
          {q ? (
            <button type="button" onClick={() => setQ('')} aria-label="Tozalash">
              <IconX size={14} />
            </button>
          ) : null}
        </div>
        <Select
          ariaLabel="Kategoriya"
          value={cat}
          onChange={setCat}
          options={[
            { value: '', label: 'Barcha kategoriyalar' },
            ...cats.map((c) => ({ value: c, label: c })),
          ]}
        />
        <Select
          ariaLabel="Dizayn"
          value={tpl}
          onChange={setTpl}
          options={[
            { value: '', label: 'Barcha dizaynlar' },
            ...tpls.map((t) => ({ value: t, label: templateLabel(t) })),
          ]}
        />
        <Select
          ariaLabel="Saralash"
          value={sort}
          onChange={(v) => setSort(v as Sort)}
          options={SORTS.map((x) => ({ value: x.id, label: x.label }))}
        />
        {filtered ? (
          <button className="a-btn sm" type="button" onClick={reset}>
            Tozalash
          </button>
        ) : null}
      </div>

      <p className="muted" style={{ fontSize: 13, margin: '0 0 14px' }}>
        {list.length} ta natija{filtered ? ` · ${all.length} tadan` : ''}
      </p>

      {!list.length ? (
        <div className="a-note">
          Hech narsa topilmadi. Boshqa so‘z bilan qidiring yoki filtrlarni tozalang.
        </div>
      ) : null}

      <div className="a-tgrid">
        {list.map((p) => (
          <article className="a-tcard" key={p.id} style={{ ['--tone' as string]: TONE[p.template] }}>
            <button type="button" className="a-tthumb" onClick={() => setPreview(p)}>
              {p.content.images[0] ? <img src={imgSrc(p.content.images[0])} alt="" loading="lazy" /> : null}
              <span className="a-tkind">{templateLabel(p.template)}</span>
              {p.payout ? <span className="a-tpayout">+{p.payout}</span> : null}
              <span className="a-tview">
                <IconEye size={16} /> Ko‘rish
              </span>
            </button>
            <div className="a-tbody">
              <b className="a-tname">{p.product}</b>
              <p className="a-tgoal">{p.goal}</p>
              <div className="a-tprice">
                <b>
                  {p.content.priceNew} {p.content.currency}
                </b>
                {p.content.priceOld ? <s>{p.content.priceOld}</s> : null}
                <a href={p.sourceUrl} target="_blank" rel="noreferrer" title="Mahsulot manbasi">
                  {p.offerId ? `#${p.offerId}` : p.source}
                </a>
              </div>
              <div className="a-ttags">
                <span>{p.category}</span>
              </div>
              <div className="a-tactions">
                <button className="a-btn sm" type="button" onClick={() => setPreview(p)}>
                  <IconEye size={14} /> Ko‘rish
                </button>
                <button className="a-btn sm p" type="button" onClick={() => setUsing(p)}>
                  Ishlatish
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {preview ? (
        <PreviewModal
          preset={preview}
          marketLabel={name}
          onClose={() => setPreview(null)}
          onUse={() => {
            setUsing(preview);
            setPreview(null);
          }}
        />
      ) : null}
      {using ? <CreateLandingModal preset={using} onClose={() => setUsing(null)} /> : null}
    </div>
  );
}

export default function Templates() {
  const { market: code } = useParams();
  const q = useQuery({
    queryKey: ['presets'],
    queryFn: () => api<Preset[]>('/api/admin/presets'),
    staleTime: 5 * 60_000,
  });
  const mq = useQuery({ queryKey: ['markets'], queryFn: () => api<Market[]>('/api/admin/markets') });

  useEffect(() => {
    if (!code) document.title = 'Shablonlar';
  }, [code]);

  if (q.isLoading) return <p className="muted">Yuklanmoqda…</p>;
  if (q.isError) return <p className="a-err">Shablonlar yuklanmadi</p>;

  const presets = q.data || [];
  const markets = mq.data || [];

  return code ? (
    <MarketCatalog code={code} presets={presets} market={markets.find((m) => m.code === code) || null} />
  ) : (
    <MarketPicker presets={presets} markets={markets} />
  );
}
