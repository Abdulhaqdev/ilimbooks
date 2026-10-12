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
import { Toggle, useConfirm, useToast } from '../components/ui';
import { api, formatNum } from '../lib/api';
import { imgSrc, landingUrl, normSlug, templateLabel, type Landing } from '../lib/landings';
import type { RotationStats, VariantStat } from '../lib/rotations';
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
    mutationFn: (v: { variantId: string; active: boolean }) =>
      api(`/api/admin/rotations/${id}/variants/${v.variantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: v.active }),
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
          <small className="muted">Navbat shu tartibda aylanadi</small>
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
                  <small className="muted">
                    {v.path} · {templateLabel(v.template)}
                  </small>
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

        <div className="a-panel-b">
          <div className="a-row" style={{ margin: 0, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 230, flex: 1 }}>
              <Select
                block
                ariaLabel="Qo‘shiladigan landing"
                value={adding}
                onChange={setAdding}
                options={[
                  { value: '', label: 'Landing tanlang…' },
                  ...free.map((l) => ({ value: l.id, label: l.name, hint: l.path })),
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
