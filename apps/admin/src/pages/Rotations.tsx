import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IconCheck,
  IconExternal,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX,
} from '../components/icons';
import { Toggle, useConfirm, useToast } from '../components/ui';
import { accountLabel, getAccount } from '../lib/account';
import { api, formatNum } from '../lib/api';
import { imgSrc, landingUrl, normSlug, templateLabel, type Landing } from '../lib/landings';
import type { RotationRow } from '../lib/rotations';

const slugify = (s: string) => normSlug(s.replace(/[‘’ʻʼ'`]/g, '')).replace(/^-|-$/g, '');

function CreateModal({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  const lq = useQuery({ queryKey: ['landings'], queryFn: () => api<Landing[]>('/api/admin/landings') });
  const list = useMemo(() => {
    const rows = lq.data || [];
    const needle = q.trim().toLowerCase();
    return needle
      ? rows.filter((l) => `${l.name} ${l.path}`.toLowerCase().includes(needle))
      : rows;
  }, [lq.data, q]);

  const create = useMutation({
    mutationFn: () =>
      api<{ id: string }>('/api/admin/rotations', {
        method: 'POST',
        body: JSON.stringify({ name, slug, landingIds: picked }),
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['rotations'] });
      toast.ok('Rotatsiya yaratildi');
      nav(`/rotations/${r.id}`);
    },
    onError: (e) => setErr(e instanceof Error ? e.message : 'Xatolik'),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) return setErr('Nom kiriting');
    if (!slug) return setErr('URL manzilini kiriting');
    if (picked.length < 2) return setErr('Kamida 2 ta landing tanlang');
    create.mutate();
  }

  return (
    <div className="a-modal-back" onClick={onClose}>
      <form className="a-modal a-rot-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="a-modal-h">
          <h2>Yangi rotatsiya</h2>
          <button className="a-icon-btn" type="button" onClick={onClose} aria-label="Yopish">
            <IconX />
          </button>
        </div>
        <p className="muted" style={{ margin: '0 0 18px', fontSize: 13.5 }}>
          Bitta havola — ichidagi landinglar har bir yangi tashrifchiga navbat bilan ko‘rsatiladi.
          Qaysi biri ko‘proq buyurtma beryaptini statistikada ko‘rasiz.
        </p>

        <div className="a-f">
          <div className="a-grid-2">
            <div>
              <label className="a-lbl" htmlFor="rn">Nomi (faqat adminda)</label>
              <input
                id="rn"
                className="a-in"
                autoFocus
                value={name}
                placeholder="Masalan: Atirlar — A/B"
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value).slice(0, 40));
                }}
              />
            </div>
            <div>
              <label className="a-lbl" htmlFor="rs">URL manzil</label>
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
          </div>

          <div>
            <div className="a-row spread" style={{ margin: '0 0 8px' }}>
              <span className="a-lbl" style={{ margin: 0 }}>
                Landinglar {picked.length ? `· ${picked.length} ta tanlandi` : ''}
              </span>
              {picked.length ? (
                <button className="a-btn sm" type="button" onClick={() => setPicked([])}>
                  Tozalash
                </button>
              ) : null}
            </div>
            <input
              className="a-in"
              value={q}
              placeholder="Landing qidirish…"
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="a-pick">
              {lq.isLoading ? <p className="muted">Yuklanmoqda…</p> : null}
              {list.map((l) => {
                const on = picked.includes(l.id);
                return (
                  <button
                    type="button"
                    key={l.id}
                    className={on ? 'a-pick-row on' : 'a-pick-row'}
                    onClick={() =>
                      setPicked((p) => (on ? p.filter((x) => x !== l.id) : [...p, l.id]))
                    }
                  >
                    <span className="a-pick-img">
                      {l.content.images[0] ? <img src={imgSrc(l.content.images[0])} alt="" /> : null}
                    </span>
                    <span className="a-pick-t">
                      <b>{l.name}</b>
                      <small>
                        {l.path} · {templateLabel(l.template)}
                      </small>
                    </span>
                    <span className="a-pick-mark">{on ? <IconCheck size={14} /> : null}</span>
                  </button>
                );
              })}
              {!lq.isLoading && !list.length ? <p className="muted">Landing topilmadi</p> : null}
            </div>
          </div>

          {err ? <div className="a-err">{err}</div> : null}
          <div className="a-row" style={{ justifyContent: 'flex-end', margin: 0 }}>
            <button className="a-btn" type="button" onClick={onClose}>
              Bekor qilish
            </button>
            <button className="a-btn p" type="submit" disabled={create.isPending}>
              {create.isPending ? 'Yaratilmoqda…' : 'Yaratish'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function Rotations() {
  const qc = useQueryClient();
  const account = getAccount();
  const confirm = useConfirm();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');

  const q = useQuery({ queryKey: ['rotations'], queryFn: () => api<RotationRow[]>('/api/admin/rotations') });

  useEffect(() => {
    document.title = 'Rotatsiya';
  }, []);

  const refresh = () => qc.invalidateQueries({ queryKey: ['rotations'] });

  const toggle = useMutation({
    mutationFn: (r: RotationRow) =>
      api(`/api/admin/rotations/${r.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !r.active }),
      }),
    onSuccess: refresh,
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Xatolik'),
  });

  const remove = useMutation({
    mutationFn: (r: RotationRow) => api(`/api/admin/rotations/${r.id}`, { method: 'DELETE' }),
    onSuccess: (_d, r) => {
      refresh();
      toast.ok(`“${r.name}” o‘chirildi`);
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Xatolik'),
  });

  async function askRemove(r: RotationRow) {
    const ok = await confirm({
      title: 'Rotatsiya o‘chirilsinmi?',
      text: (
        <>
          <b>{r.name}</b> ({r.path}) o‘chiriladi. Landinglarning o‘ziga tegilmaydi, lekin shu
          havoladagi reklama ishlamay qoladi.
        </>
      ),
      confirmText: 'O‘chirish',
      danger: true,
    });
    if (ok) remove.mutate(r);
  }

  async function copy(r: RotationRow) {
    try {
      await navigator.clipboard.writeText(landingUrl(r.path));
      setCopied(r.id);
      setTimeout(() => setCopied(''), 1600);
    } catch {
      toast.err('Nusxa olinmadi');
    }
  }

  const rows = q.data || [];

  return (
    <div>
      <div className="a-row spread">
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <h1 className="a-h1">Rotatsiya · {accountLabel(account)}</h1>
          <p className="a-sub" style={{ marginBottom: 0 }}>
            Bitta havola — ichida bir nechta landing. Har yangi tashrifchiga navbatdagi landing
            ko‘rsatiladi, qaysi biri ko‘proq sotayotgani statistikada ko‘rinadi.
          </p>
        </div>
        <button className="a-btn p" type="button" onClick={() => setCreating(true)}>
          <IconPlus size={16} /> Yangi rotatsiya
        </button>
      </div>

      {q.isLoading ? <p className="muted">Yuklanmoqda…</p> : null}

      {!q.isLoading && !rows.length ? (
        <div className="a-empty">
          <IconRefresh size={30} />
          <strong>Hali rotatsiya yo‘q</strong>
          <p>
            Reklamaga bitta havola qo‘yib, uning ortida bir nechta landingni sinab ko‘rish uchun
            rotatsiya yarating. Qaysi landing ko‘proq buyurtma keltirayotgani aniq ko‘rinadi.
          </p>
          <button className="a-btn p" type="button" onClick={() => setCreating(true)}>
            <IconPlus size={16} /> Yangi rotatsiya
          </button>
        </div>
      ) : null}

      <div className="a-rgrid">
        {rows.map((r) => (
          <div className={r.active ? 'a-panel a-rcard' : 'a-panel a-rcard off'} key={r.id}>
            <div className="a-rhead">
              <div style={{ minWidth: 0, flex: 1 }}>
                <Link to={`/rotations/${r.id}`} className="a-rname">
                  {r.name}
                </Link>
                <div className="a-row" style={{ margin: '4px 0 0', gap: 6 }}>
                  <button className="a-rurl" type="button" onClick={() => copy(r)} title="Havoladan nusxa olish">
                    {r.path}
                    {copied === r.id ? <IconCheck size={13} /> : null}
                  </button>
                  <a
                    className="a-icon-btn"
                    href={landingUrl(r.path)}
                    target="_blank"
                    rel="noreferrer"
                    title="Ochish"
                  >
                    <IconExternal size={14} />
                  </a>
                </div>
              </div>
              <Toggle checked={r.active} onChange={() => toggle.mutate(r)} />
            </div>

            <div className="a-rthumbs">
              {r.images.map((src, i) => (
                <span key={i}>{src ? <img src={imgSrc(src)} alt="" loading="lazy" /> : null}</span>
              ))}
              <b>
                {r.live}/{r.total} landing
              </b>
            </div>

            <div className="a-lstats">
              <div>
                <b className="c-blue">{formatNum(r.stats7d.clicks)}</b>
                <span>click · 7 kun</span>
              </div>
              <div>
                <b className="c-green">{formatNum(r.stats7d.leads)}</b>
                <span>lid · 7 kun</span>
              </div>
              <div>
                <b className="c-violet">{r.stats7d.cr}%</b>
                <span>konversiya</span>
              </div>
            </div>

            <div className="a-lactions">
              <Link className="a-btn sm p" to={`/rotations/${r.id}`}>
                Statistika va sozlash
              </Link>
              <button
                className="a-icon-btn danger"
                type="button"
                title="O‘chirish"
                onClick={() => askRemove(r)}
              >
                <IconTrash size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {creating ? <CreateModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
