import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreateLandingModal } from '../components/CreateLandingModal';
import { IconCopy, IconEdit, IconExternal, IconPlus, IconSparkles, IconTrash } from '../components/icons';
import { api, formatNum } from '../lib/api';
import { imgSrc, landingUrl, templateLabel, type Landing } from '../lib/landings';

export default function Landings() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);
  const q = useQuery({
    queryKey: ['landings'],
    queryFn: () => api<Landing[]>('/api/admin/landings'),
  });

  useEffect(() => {
    document.title = 'Landinglar';
  }, []);

  const refresh = () => qc.invalidateQueries({ queryKey: ['landings'] });

  const toggle = useMutation({
    mutationFn: (l: Landing) =>
      api(`/api/admin/landings/${l.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !l.active }),
      }),
    onSuccess: refresh,
  });

  const duplicate = useMutation({
    mutationFn: (l: Landing) =>
      api<Landing>(`/api/admin/landings/${l.id}/duplicate`, { method: 'POST' }),
    onSuccess: (l) => {
      refresh();
      nav(`/landings/${l.id}`);
    },
  });

  const remove = useMutation({
    mutationFn: (l: Landing) => api(`/api/admin/landings/${l.id}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (e) => alert(e instanceof Error ? e.message : 'Xatolik'),
  });

  const rows = q.data || [];

  return (
    <div>
      <div className="a-row spread">
        <div>
          <h1 className="a-h1">Landinglar</h1>
          <p className="a-sub" style={{ marginBottom: 0 }}>
            Har bir landing — alohida manzil, kontent, Pixel va market oqimi.
          </p>
        </div>
        <div className="a-row" style={{ margin: 0 }}>
          <Link className="a-btn" to="/templates">
            <IconSparkles size={16} /> Tayyor shablonlar
          </Link>
          <button className="a-btn p" type="button" onClick={() => setCreating(true)}>
            <IconPlus size={16} /> Yangi landing
          </button>
        </div>
      </div>

      {q.isLoading ? <p className="muted">Yuklanmoqda…</p> : null}

      <div className="a-lgrid">
        {rows.map((l) => (
          <div className={l.active ? 'a-lcard' : 'a-lcard off'} key={l.id}>
            <Link to={`/landings/${l.id}`} className="a-lthumb">
              {l.content.images[0] ? <img src={imgSrc(l.content.images[0])} alt="" /> : null}
              <span className="a-lbadge">{templateLabel(l.template)}</span>
            </Link>
            <div className="a-lbody">
              <div className="a-lhead">
                <div style={{ minWidth: 0 }}>
                  <Link to={`/landings/${l.id}`} className="a-lname">{l.name}</Link>
                  <a className="a-lurl" href={landingUrl(l.path)} target="_blank" rel="noreferrer">
                    {l.path}
                  </a>
                  <div className="a-row" style={{ margin: '4px 0 0', gap: 6, flexWrap: 'wrap' }}>
                    {l.marketName ? <span className="a-pill tag">{l.marketName}</span> : null}
                    {l.offerId ? <span className="a-pill tag">#{l.offerId}</span> : null}
                    {l.ready === false ? (
                      <Link
                        to={`/landings/${l.id}`}
                        className="a-pill bad"
                        title="Buyurtma bazada saqlanadi, lekin marketga uzatilmaydi"
                      >
                        {(l.missing || []).join(' + ')} yo‘q
                      </Link>
                    ) : null}
                  </div>
                </div>
                <label className="a-toggle" title={l.active ? 'Faol — o‘chirish' : 'O‘chiq — yoqish'}>
                  <input
                    type="checkbox"
                    checked={l.active}
                    disabled={toggle.isPending}
                    onChange={() => toggle.mutate(l)}
                  />
                  <span />
                </label>
              </div>

              <div className="a-lstats">
                <div>
                  <b className="c-blue">{formatNum(l.stats7d?.clicks || 0)}</b>
                  <span>click · 7 kun</span>
                </div>
                <div>
                  <b className="c-green">{formatNum(l.stats7d?.leads || 0)}</b>
                  <span>lid · 7 kun</span>
                </div>
                <div>
                  <b className="c-violet">
                    {l.stats7d?.clicks
                      ? `${Math.round((l.stats7d.leads / l.stats7d.clicks) * 1000) / 10}%`
                      : '0%'}
                  </b>
                  <span>konversiya</span>
                </div>
              </div>

              <div className="a-lactions">
                <Link className="a-btn sm p" to={`/landings/${l.id}`}>
                  <IconEdit size={14} /> Tahrirlash
                </Link>
                <a className="a-btn sm" href={landingUrl(l.path)} target="_blank" rel="noreferrer">
                  <IconExternal size={14} /> Ochish
                </a>
                <button
                  className="a-icon-btn"
                  type="button"
                  title="Nusxa olish"
                  disabled={duplicate.isPending}
                  onClick={() => duplicate.mutate(l)}
                >
                  <IconCopy size={16} />
                </button>
                {l.slug !== '' ? (
                  <button
                    className="a-icon-btn danger"
                    type="button"
                    title="O‘chirish"
                    onClick={() => {
                      if (confirm(`"${l.name}" landingini o‘chirasizmi? Bu amalni qaytarib bo‘lmaydi.`)) {
                        remove.mutate(l);
                      }
                    }}
                  >
                    <IconTrash size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        <button className="a-lnew" type="button" onClick={() => setCreating(true)}>
          <span><IconPlus size={22} /></span>
          <strong>Yangi landing qo‘shish</strong>
          <small>Asosiy landingdan nusxa bilan boshlanadi</small>
        </button>
      </div>

      {creating ? <CreateLandingModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
