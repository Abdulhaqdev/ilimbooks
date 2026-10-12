import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { CreateLandingModal } from '../components/CreateLandingModal';
import { IconCheck, IconExternal, IconEye, IconSparkles, IconX } from '../components/icons';
import { PhonePreview } from '../components/PhonePreview';
import { api } from '../lib/api';
import { hasFeature, imgSrc, landingUrl, templateLabel, type Feature, type Preset } from '../lib/landings';

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

function PreviewModal({ preset, onClose, onUse }: { preset: Preset; onClose: () => void; onUse: () => void }) {
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
              Buyurtmalar ShoxMarket’dagi #{preset.offerId} mahsulotga yuboriladi. Haqiqiy sharhlaringiz bo‘lsa, landingni tahrirlashda
              qo‘shing.
            </div>
          ) : (
            <div className="a-note" style={{ marginTop: 16 }}>
              Sharhlar, mijozlar soni va qoldiq — namunaviy. Ishga tushirishdan oldin haqiqiy ma’lumotlar bilan almashtiring.
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

export default function Templates() {
  const q = useQuery({ queryKey: ['presets'], queryFn: () => api<Preset[]>('/api/admin/presets'), staleTime: 5 * 60_000 });
  const [cat, setCat] = useState('');
  const [src, setSrc] = useState('');
  const [preview, setPreview] = useState<Preset | null>(null);
  const [using, setUsing] = useState<Preset | null>(null);

  useEffect(() => {
    document.title = 'Shablonlar';
  }, []);

  const presets = q.data || [];
  const sources = useMemo(() => [...new Set(presets.map((p) => p.source))], [presets]);
  const bySource = src ? presets.filter((p) => p.source === src) : presets;
  const cats = useMemo(() => [...new Set(bySource.map((p) => p.category))], [bySource]);
  const list = cat ? bySource.filter((p) => p.category === cat) : bySource;

  return (
    <div>
      <h1 className="a-h1">Tayyor shablonlar</h1>
      <p className="a-sub">
        {presets.length || 10} ta sotuvchi shablon — har biri alohida mahsulotga moslangan, market
        offer ID bilan tayyor. Shablonni tanlang, kerak bo‘lsa matn va rasmlarni o‘zgartirib ishga
        tushiring. Landing shablonning marketiga avtomatik bog‘lanadi.
      </p>

      {sources.length > 1 ? (
        <div className="a-seg" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={!src ? 'on' : ''}
            onClick={() => {
              setSrc('');
              setCat('');
            }}
          >
            Barcha marketlar
          </button>
          {sources.map((sv) => (
            <button
              key={sv}
              type="button"
              className={src === sv ? 'on' : ''}
              onClick={() => {
                setSrc(sv);
                setCat('');
              }}
            >
              {sv}
            </button>
          ))}
        </div>
      ) : null}

      {cats.length > 1 ? (
        <div className="a-seg" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
          <button type="button" className={!cat ? 'on' : ''} onClick={() => setCat('')}>
            Hammasi
          </button>
          {cats.map((c) => (
            <button key={c} type="button" className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      ) : null}

      {q.isLoading ? <p className="muted">Yuklanmoqda…</p> : null}
      {q.isError ? <p className="a-err">Shablonlar yuklanmadi</p> : null}

      <div className="a-tgrid">
        {list.map((p) => (
          <article className="a-tcard" key={p.id} style={{ ['--tone' as string]: TONE[p.template] }}>
            <button type="button" className="a-tthumb" onClick={() => setPreview(p)}>
              {p.content.images[0] ? <img src={imgSrc(p.content.images[0])} alt="" loading="lazy" /> : null}
              <span className="a-tkind">{templateLabel(p.template)}</span>
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
                  {p.source}
                </a>
              </div>
              <div className="a-ttags">
                {p.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
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
