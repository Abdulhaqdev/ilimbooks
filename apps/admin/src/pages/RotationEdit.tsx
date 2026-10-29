import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  IconArrowLeft,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconEdit,
  IconExternal,
  IconPlus,
  IconTrash,
  IconTrendUp,
} from '../components/icons';
import { Select } from '../components/Select';
import { TemplateBadge, TemplatePicker } from '../components/TemplatePicker';
import { Toggle, useConfirm, useToast } from '../components/ui';
import { api, formatNum } from '../lib/api';
import { imgSrc, landingUrl, normSlug, templateLabel, type Landing } from '../lib/landings';
import { ROTATION_MODES, type RotationStats, type VariantStat } from '../lib/rotations';
import { useTime } from '../lib/time';

function Bar({ value, max, tone }: { value: number; max: number; tone: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <span className="a-vbar" aria-hidden>
      <span style={{ width: `${pct}%`, background: tone }} />
    </span>
  );
}

export default function RotationEdit() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const t = useTime();
  const confirm = useConfirm();
  const toast = useToast();
  const [adding, setAdding] = useState('');
  const [renaming, setRenaming] = useState<{ name: string; slug: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [tplBase, setTplBase] = useState('');
  const [tplPick, setTplPick] = useState<string[]>([]);

  const q = useQuery({
    queryKey: ['rotation', id, t.keyPart],
    queryFn: () => api<RotationStats>(`/api/admin/rotations/${id}/stats?${t.param}`),
    refetchInterval: 60_000,
  });
  const lq = useQuery({ queryKey: ['landings'], queryFn: () => api<Landing[]>('/api/admin/landings') });

  const rot = q.data?.rotation;

  useEffect(() => {
    document.title = rot ? `${rot.name} — rotatsiya` : 'Rotatsiya';
  }, [rot?.name]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['rotation', id] });
    qc.invalidateQueries({ queryKey: ['rotations'] });
  };
  const fail = (e: unknown) => toast.err(e instanceof Error ? e.message : 'Xatolik');

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/api/admin/rotations/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      refresh();
      setRenaming(null);
      toast.ok('Saqlandi');
    },
    onError: fail,
  });

  const setVariant = useMutation({
    mutationFn: ({ variantId, ...body }: { variantId: string; active?: boolean; weight?: number }) =>
      api(`/api/admin/rotations/${id}/variants/${variantId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: refresh,
    onError: fail,
  });

  const move = useMutation({
    mutationFn: (v: { variantId: string; dir: 'up' | 'down' }) =>
      api(`/api/admin/rotations/${id}/variants/${v.variantId}/move`, {
        method: 'POST',
        body: JSON.stringify({ dir: v.dir }),
      }),
    onSuccess: refresh,
    onError: fail,
  });

  const addVariant = useMutation({
    mutationFn: (landingId: string) =>
      api(`/api/admin/rotations/${id}/variants`, {
        method: 'POST',
        body: JSON.stringify({ landingId }),
      }),
    onSuccess: () => {
      refresh();
      setAdding('');
      toast.ok('Landing qo‘shildi');
    },
    onError: fail,
  });

  const addTemplates = useMutation({
    mutationFn: (v: { landingId: string; templates: string[] }) =>
      api(`/api/admin/rotations/${id}/template-variants`, { method: 'POST', body: JSON.stringify(v) }),
    onSuccess: (_d, v) => {
      refresh();
      qc.invalidateQueries({ queryKey: ['landings'] });
      setTplPick([]);
      toast.ok(`${v.templates.length} ta shablon qo‘shildi`);
    },
    onError: fail,
  });

  const removeVariant = useMutation({
    mutationFn: (variantId: string) =>
      api(`/api/admin/rotations/${id}/variants/${variantId}`, { method: 'DELETE' }),
    onSuccess: () => {
      refresh();
      toast.ok('Rotatsiyadan chiqarildi');
    },
    onError: fail,
  });

  const free = useMemo(() => {
    const used = new Set(rot?.variants.map((v) => v.landingId) || []);
    return (lq.data || []).filter((l) => !used.has(l.id));
  }, [lq.data, rot]);

  if (q.isLoading || !q.data || !rot) {
    return <p className="muted">{q.isError ? 'Rotatsiya topilmadi' : 'Yuklanmoqda…'}</p>;
  }

  const { totals, variants, winner, enough } = q.data;
  const liveVariants = variants.filter((v) => v.active && v.landingActive);
  const liveTemplates = new Set(liveVariants.map((v) => v.template));
  const usedTemplates = [...new Set(variants.map((v) => v.template))];
  const baseId = tplBase || variants[0]?.landingId || '';
  const maxSessions = Math.max(1, ...variants.map((v) => v.sessions));
  const maxCr = Math.max(1, ...variants.map((v) => v.cr));

  async function askRemoveVariant(v: VariantStat) {
    const ok = await confirm({
      title: 'Rotatsiyadan chiqarilsinmi?',
      text: (
        <>
          <b>{v.name}</b> shu havoladan chiqariladi. Landingning o‘zi va uning statistikasi
          saqlanib qoladi — faqat bu rotatsiyada ko‘rsatilmaydi.
        </>
      ),
      confirmText: 'Chiqarish',
      danger: true,
    });
    if (ok) removeVariant.mutate(v.id);
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(landingUrl(rot!.path));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.err('Nusxa olinmadi');
    }
  }

  return (
    <div>
      <div className="a-row" style={{ margin: '0 0 10px' }}>
        <Link className="a-btn sm" to="/rotations">
          <IconArrowLeft size={14} /> Rotatsiyalar
        </Link>
      </div>

      <div className="a-row spread" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          {renaming ? (
            <div className="a-row" style={{ margin: 0, flexWrap: 'wrap' }}>
              <input
                className="a-in"
                style={{ maxWidth: 260 }}
                value={renaming.name}
                onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
              />
              <div className="a-prefix" style={{ maxWidth: 320 }}>
                <span>{landingUrl('/').replace(/^https?:\/\//, '')}</span>
                <input
                  value={renaming.slug}
                  onChange={(e) => setRenaming({ ...renaming, slug: normSlug(e.target.value) })}
                />
              </div>
              <button
                className="a-btn p"
                type="button"
                disabled={patch.isPending}
                onClick={() => patch.mutate({ name: renaming.name, slug: renaming.slug })}
              >
                Saqlash
              </button>
              <button className="a-btn" type="button" onClick={() => setRenaming(null)}>
                Bekor
              </button>
            </div>
          ) : (
            <>
              <h1 className="a-h1" style={{ marginBottom: 6 }}>
                {rot.name}
                <button
                  className="a-icon-btn"
                  type="button"
                  title="Nomi va manzilini o‘zgartirish"
                  style={{ marginLeft: 8, verticalAlign: 'middle' }}
                  onClick={() => setRenaming({ name: rot.name, slug: rot.slug })}
                >
                  <IconEdit size={15} />
                </button>
              </h1>
              <div className="a-row" style={{ margin: 0, gap: 8 }}>
                <button className="a-rurl big" type="button" onClick={copyUrl} title="Nusxa olish">
                  {landingUrl(rot.path).replace(/^https?:\/\//, '')}
                  {copied ? <IconCheck size={14} /> : null}
                </button>
                <a className="a-icon-btn" href={landingUrl(rot.path)} target="_blank" rel="noreferrer" title="Ochish">
                  <IconExternal size={15} />
                </a>
              </div>
            </>
          )}
        </div>
        <label className="a-switch-inline">
          <Toggle checked={rot.active} onChange={(v) => patch.mutate({ active: v })} />
          <span>{rot.active ? 'Havola ishlayapti' : 'O‘chirilgan'}</span>
        </label>
      </div>

      <div className="a-choice a-rmode" style={{ marginTop: 16 }}>
        {ROTATION_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={rot.mode === m.id ? 'on' : undefined}
            disabled={patch.isPending}
            onClick={() => rot.mode !== m.id && patch.mutate({ mode: m.id })}
          >
            <strong>{m.label}</strong>
            <span>{m.hint}</span>
          </button>
        ))}
      </div>

      {liveVariants.length < 2 ? (
        <div className="a-note warn" style={{ marginTop: 12 }}>
          Hozir faqat {liveVariants.length} ta variant ko‘rsatilyapti — havola almashmaydi. Kamida 2 ta variantni yoqing
          (landingning o‘zi ham yoqilgan bo‘lishi kerak).
        </div>
      ) : liveTemplates.size === 1 ? (
        <div className="a-note warn" style={{ marginTop: 12 }}>
          Ko‘rsatilayotgan variantlarning hammasi “{templateLabel([...liveTemplates][0])}” shablonida — dizayn
          almashmaydi. Pastdagi “Boshqa shablon qo‘shish” orqali yangi shablon qo‘shing.
        </div>
      ) : null}

      <div className={rot.autoWinner ? 'a-panel a-auto on' : 'a-panel a-auto'}>
        <div className="a-auto-main">
          <span className="a-auto-ic">
            <IconTrendUp size={18} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <b>Avtomatik g‘olib</b>
            <p>
              Har bir variantga kamida {rot.autoMinViews} ta ko‘rish yig‘ilgach, konversiyasi yetakchidan aniq (~95%
              ishonch bilan) past bo‘lganlari o‘zi o‘chiriladi. Yetakchi doim qoladi. O‘chirilgan variantni qayta
              yoqsangiz, uning hisobi noldan boshlanadi.
            </p>
          </div>
          <Toggle
            checked={rot.autoWinner}
            disabled={patch.isPending}
            onChange={(on) => patch.mutate({ autoWinner: on })}
          />
        </div>
        {rot.autoWinner ? (
          <div className="a-row" style={{ margin: '10px 0 0', gap: 8 }}>
            <span className="muted" style={{ fontSize: 12.5 }}>Har variantga kamida</span>
            <div className="a-seg">
              {[50, 100, 200, 500].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={rot.autoMinViews === n ? 'on' : ''}
                  onClick={() => rot.autoMinViews !== n && patch.mutate({ autoMinViews: n })}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className="muted" style={{ fontSize: 12.5 }}>ko‘rish</span>
          </div>
        ) : null}
      </div>

      <div className="a-stat4" style={{ marginTop: 18 }}>
        <div className="a-card">
          <div className="a-card-k">Ko‘rishlar</div>
          <div className="a-card-v">{formatNum(totals.sessions)}</div>
        </div>
        <div className="a-card">
          <div className="a-card-k">Buyurtmalar</div>
          <div className="a-card-v c-green">{formatNum(totals.leads)}</div>
        </div>
        <div className="a-card">
          <div className="a-card-k">Konversiya</div>
          <div className="a-card-v c-violet">{totals.cr}%</div>
        </div>
        <div className="a-card">
          <div className="a-card-k">Marketga uzatildi</div>
          <div className="a-card-v">{formatNum(totals.sent)}</div>
        </div>
      </div>

      {!enough ? (
        <div className="a-note" style={{ marginTop: 14 }}>
          Xulosa chiqarish uchun ma’lumot hali kam. Har bir variantga kamida ~100 ta ko‘rish
          yig‘ilgach, natija ishonchli bo‘ladi.
        </div>
      ) : null}

      <div className="a-panel" style={{ marginTop: 18 }}>
        <div className="a-panel-h">
          <span>Variantlar — qaysi landing ko‘proq sotyapti</span>
          <small className="muted">“×” — trafik ulushi: 2× variant 1× dan ikki barobar ko‘p ko‘rsatiladi</small>
        </div>
        <div className="a-vlist">
          {variants.map((v, i) => {
            const isWinner = winner === v.landingId;
            const off = !v.active || !v.landingActive;
            return (
              <div className={off ? 'a-vrow off' : 'a-vrow'} key={v.id}>
                <div className="a-vord">
                  <button
                    className="a-icon-btn"
                    type="button"
                    disabled={i === 0 || move.isPending}
                    title="Yuqoriga"
                    onClick={() => move.mutate({ variantId: v.id, dir: 'up' })}
                  >
                    <IconChevronUp size={14} />
                  </button>
                  <b>{i + 1}</b>
                  <button
                    className="a-icon-btn"
                    type="button"
                    disabled={i === variants.length - 1 || move.isPending}
                    title="Pastga"
                    onClick={() => move.mutate({ variantId: v.id, dir: 'down' })}
                  >
                    <IconChevronDown size={14} />
                  </button>
                </div>

                <span className="a-vimg">{v.image ? <img src={imgSrc(v.image)} alt="" loading="lazy" /> : null}</span>

                <div className="a-vinfo">
                  <div className="a-row" style={{ margin: 0, gap: 7 }}>
                    <Link to={`/landings/${v.landingId}`} className="a-vname">
                      {v.name}
                    </Link>
                    {isWinner ? (
                      <span className="a-pill ok">
                        <IconTrendUp size={12} /> yetakchi
                      </span>
                    ) : null}
                    {!v.landingActive ? <span className="a-pill bad">landing o‘chiq</span> : null}
                  </div>
                  <div className="a-row" style={{ margin: '3px 0 0', gap: 6 }}>
                    <TemplateBadge t={v.template} label={templateLabel(v.template)} />
                    <a className="muted a-vpath" href={landingUrl(v.path)} target="_blank" rel="noreferrer" title="Shu variantni ochish">
                      {v.path} <IconExternal size={11} />
                    </a>
                  </div>
                  {!v.active && v.autoOffAt ? (
                    <div className="a-vauto">
                      Avtomatik o‘chirildi · {new Date(v.autoOffAt).toLocaleDateString('uz-UZ')}
                      <small>{v.autoOffNote}</small>
                    </div>
                  ) : null}
                  {v.active && rot.autoWinner && v.freshViews < rot.autoMinViews ? (
                    <div className="a-vprog" title="Avtomatik g‘olib baholashigacha">
                      <span style={{ width: `${Math.round((v.freshViews / rot.autoMinViews) * 100)}%` }} />
                      <small>
                        {v.freshViews}/{rot.autoMinViews} ko‘rish — baholashgacha
                      </small>
                    </div>
                  ) : null}
                </div>

                <div className="a-vshare" title="Trafik ulushi — shu variantga ketadigan tashrifchilar">
                  <b>{v.share}%</b>
                  <select
                    aria-label="Trafik ulushi"
                    value={v.weight}
                    disabled={setVariant.isPending}
                    onChange={(e) => setVariant.mutate({ variantId: v.id, weight: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}×
                      </option>
                    ))}
                  </select>
                  <span>ulush</span>
                </div>

                <div className="a-vmetrics">
                  <div>
                    <b>{formatNum(v.sessions)}</b>
                    <span>ko‘rish</span>
                    <Bar value={v.sessions} max={maxSessions} tone="var(--primary)" />
                  </div>
                  <div>
                    <b className="c-green">{formatNum(v.leads)}</b>
                    <span>buyurtma</span>
                    <Bar value={v.leads} max={Math.max(1, ...variants.map((x) => x.leads))} tone="var(--green)" />
                  </div>
                  <div>
                    <b className="c-violet">{v.cr}%</b>
                    <span>konversiya</span>
                    <Bar value={v.cr} max={maxCr} tone="var(--violet-text)" />
                  </div>
                  <div>
                    <b>{v.avgDwellSec}s</b>
                    <span>o‘rtacha vaqt</span>
                  </div>
                </div>

                <div className="a-vactions">
                  <span title={v.active ? 'Ko‘rsatilyapti — o‘chirish' : 'O‘chirilgan — yoqish'}>
                    <Toggle
                      checked={v.active}
                      disabled={setVariant.isPending}
                      onChange={(on) => setVariant.mutate({ variantId: v.id, active: on })}
                    />
                  </span>
                  <button
                    className="a-icon-btn danger"
                    type="button"
                    title="Rotatsiyadan chiqarish"
                    onClick={() => askRemoveVariant(v)}
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="a-panel-b a-radd">
          <div className="a-step">
            <IconPlus size={14} /> Boshqa shablon qo‘shish
          </div>
          <div style={{ maxWidth: 420, marginBottom: 10 }}>
            <Select
              block
              ariaLabel="Qaysi variantdan nusxa olinsin"
              value={baseId}
              onChange={setTplBase}
              options={variants.map((v) => ({ value: v.landingId, label: v.name, hint: templateLabel(v.template) }))}
            />
          </div>
          <TemplatePicker value={tplPick} onChange={setTplPick} hidden={[...usedTemplates, 'reviews']} />
          <div className="a-row" style={{ margin: '10px 0 0' }}>
            <button
              className="a-btn p"
              type="button"
              disabled={!tplPick.length || !baseId || addTemplates.isPending}
              onClick={() => addTemplates.mutate({ landingId: baseId, templates: tplPick })}
            >
              {addTemplates.isPending ? 'Qo‘shilmoqda…' : `${tplPick.length || ''} ta shablonni qo‘shish`}
            </button>
            <span className="a-hint" style={{ margin: 0 }}>
              Tanlangan variantning matn va rasmlari bilan yangi shablonli nusxa yaratiladi.
            </span>
          </div>
        </div>

        <div className="a-panel-b">
          <div className="a-step">Tayyor landingni qo‘shish</div>
          <div className="a-row" style={{ margin: 0, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 230, flex: 1 }}>
              <Select
                block
                ariaLabel="Qo‘shiladigan landing"
                value={adding}
                onChange={setAdding}
                options={[
                  { value: '', label: 'Landing tanlang…' },
                  ...free.map((l) => ({ value: l.id, label: l.name, hint: `${templateLabel(l.template)} · ${l.path}` })),
                ]}
              />
            </div>
            <button
              className="a-btn p"
              type="button"
              disabled={!adding || addVariant.isPending}
              onClick={() => addVariant.mutate(adding)}
            >
              <IconPlus size={15} /> Rotatsiyaga qo‘shish
            </button>
          </div>
          <div className="a-hint">
            O‘chirilgan variant ko‘rsatilmaydi, lekin to‘plangan statistikasi saqlanadi — keyin
            qayta yoqsangiz davom etadi.
          </div>
        </div>
      </div>
    </div>
  );
}
