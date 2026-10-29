import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconCheck, IconExternal, IconPlus, IconRefresh, IconTrash } from '../components/icons';
import { TemplateBadge } from '../components/TemplatePicker';
import { Toggle, useConfirm, useToast } from '../components/ui';
import { accountLabel, getAccount } from '../lib/account';
import { api, formatNum } from '../lib/api';
import { imgSrc, landingUrl, templateLabel } from '../lib/landings';
import { type RotationRow } from '../lib/rotations';

export default function Rotations() {
  const qc = useQueryClient();
  const account = getAccount();
  const confirm = useConfirm();
  const toast = useToast();
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
            Bitta havola — ichida bir nechta shablon. Havola ochilganda navbatdagi variant
            ko‘rsatiladi, qaysi biri ko‘proq sotayotgani statistikada ko‘rinadi.
          </p>
        </div>
        <Link className="a-btn p" to="/rotations/new">
          <IconPlus size={16} /> Yangi rotatsiya
        </Link>
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
          <Link className="a-btn p" to="/rotations/new">
            <IconPlus size={16} /> Yangi rotatsiya
          </Link>
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

            <div className="a-rtpls">
              {r.templates.map((t) => (
                <TemplateBadge key={t} t={t} label={templateLabel(t)} />
              ))}
              <span className="a-pill tag">{r.mode === 'sticky' ? 'Bir odamga bitta' : 'Har ochilishda almashadi'}</span>
            </div>
            {r.live < 2 ? (
              <div className="a-note warn" style={{ margin: 0 }}>
                Faqat {r.live} ta variant ko‘rsatilyapti — havola almashmaydi.
              </div>
            ) : r.templates.length === 1 ? (
              <div className="a-note warn" style={{ margin: 0 }}>
                Hamma variant bitta shablonda — dizayn almashmaydi.
              </div>
            ) : null}

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

    </div>
  );
}
