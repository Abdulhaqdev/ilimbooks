import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconCopy, IconEdit, IconExternal, IconRefresh, IconSparkles, IconTrash, IconX } from '../components/icons';
import { Select } from '../components/Select';
import { Toggle, useConfirm, useToast } from '../components/ui';
import { accountLabel, getAccount } from '../lib/account';
import { api, formatNum } from '../lib/api';
import { imgSrc, landingUrl, templateLabel, type Landing } from '../lib/landings';

const cr = (l: Landing) => (l.stats7d?.clicks ? l.stats7d.leads / l.stats7d.clicks : 0);

export default function Landings() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const account = getAccount();
  const confirm = useConfirm();
  const toast = useToast();
  const q = useQuery({
    queryKey: ['landings'],
    queryFn: () => api<Landing[]>('/api/admin/landings'),
  });

  useEffect(() => {
    document.title = 'Landinglar';
  }, []);

  const refresh = () => qc.invalidateQueries({ queryKey: ['landings'] });

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [tpl, setTpl] = useState('');
  const [market, setMarket] = useState('');
  const [sort, setSort] = useState('new');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const bulk = useMutation({
    mutationFn: async ({ ids, active }: { ids: string[]; active: boolean }) => {
      const res = await Promise.allSettled(
        ids.map((id) => api(`/api/admin/landings/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) })),
      );
      return { active, ok: res.filter((r) => r.status === 'fulfilled').length, total: ids.length };
    },
    onSuccess: (r) => {
      refresh();
      setSelected(new Set());
      const what = r.active ? 'yoqildi' : 'o‘chirildi';
      if (r.ok === r.total) toast.ok(`${r.ok} ta landing ${what}`);
      else toast.err(`${r.total} tadan ${r.ok} tasi ${what}`);
    },
  });

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
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Xatolik'),
  });

  const remove = useMutation({
    mutationFn: (l: Landing) => api(`/api/admin/landings/${l.id}`, { method: 'DELETE' }),
    onSuccess: (_d, l) => {
      refresh();
      toast.ok(`“${l.name}” o‘chirildi`);
    },
    onError: (e) => toast.err(e instanceof Error ? e.message : 'Xatolik'),
  });

  async function askRemove(l: Landing) {
    const ok = await confirm({
      title: 'Landing o‘chirilsinmi?',
      text: (
        <>
          <b>{l.name}</b> ({l.path}) butunlay o‘chiriladi. Bu amalni qaytarib bo‘lmaydi — reklama
          havolalari ham ishlamay qoladi.
        </>
      ),
      confirmText: 'O‘chirish',
      danger: true,
    });
    if (ok) remove.mutate(l);
  }

  const all = q.data || [];
  const needle = search.trim().toLowerCase();
  const rows = all
    .filter((l) => {
      if (status === 'on' && !l.active) return false;
      if (status === 'off' && l.active) return false;
      if (status === 'issue' && l.ready !== false) return false;
      if (tpl && l.template !== tpl) return false;
      if (market && (l.marketName || '—') !== market) return false;
      if (!needle) return true;
      return [l.name, l.path, l.offerId, l.marketName].some((v) => (v || '').toLowerCase().includes(needle));
    })
    .sort((a, b) => {
      const la = a.stats7d?.leads || 0;
      const lb = b.stats7d?.leads || 0;
      if (sort === 'leads') return lb - la;
      if (sort === 'clicks') return (b.stats7d?.clicks || 0) - (a.stats7d?.clicks || 0);
      if (sort === 'cr') return cr(b) - cr(a);
      if (sort === 'name') return a.name.localeCompare(b.name);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  const templates = [...new Set(all.map((l) => l.template))];
  const markets = [...new Set(all.map((l) => l.marketName || '—'))];
  const issues = all.filter((l) => l.ready === false).length;
  const selRows = all.filter((l) => selected.has(l.id));
  const filtered = Boolean(needle || status || tpl || market);

  const pick = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div>
      <div className="a-row spread">
        <div>
          <h1 className="a-h1">Landinglar · {accountLabel(account)}</h1>
          <p className="a-sub" style={{ marginBottom: 0 }}>
            Har bir landing — alohida manzil, kontent, Pixel va market oqimi. Yangisi tayyor
            shablonlar katalogidan qo‘shiladi.
          </p>
        </div>
        <div className="a-row" style={{ margin: 0 }}>
          <Link className="a-btn p" to="/templates">
            <IconSparkles size={16} /> Shablondan qo‘shish
          </Link>
        </div>
      </div>

      {q.isLoading ? <p className="muted">Yuklanmoqda…</p> : null}

      <div className="a-tbar">
        <div className="a-search">
          <input
            className="a-in"
            value={search}
            placeholder="Qidirish: nomi, manzil, offer…"
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button type="button" onClick={() => setSearch('')} aria-label="Tozalash">
              <IconX size={14} />
            </button>
          ) : null}
        </div>
        <div className="a-seg">
          {[
            ['', `Hammasi · ${all.length}`],
            ['on', 'Faol'],
            ['off', 'O‘chiq'],
            ...(issues ? [['issue', `Muammoli · ${issues}`]] : []),
          ].map(([v, label]) => (
            <button key={v} type="button" className={status === v ? 'on' : ''} onClick={() => setStatus(v)}>
              {label}
            </button>
          ))}
        </div>
        <Select
          ariaLabel="Shablon"
          value={tpl}
          onChange={setTpl}
          options={[{ value: '', label: 'Barcha shablonlar' }, ...templates.map((t) => ({ value: t, label: templateLabel(t) }))]}
        />
        {markets.length > 1 ? (
          <Select
            ariaLabel="Market"
            value={market}
            onChange={setMarket}
            options={[
              { value: '', label: 'Barcha marketlar' },
              ...markets.map((m) => ({ value: m, label: m === '—' ? 'Marketsiz' : m })),
            ]}
          />
        ) : null}
        <Select
          ariaLabel="Saralash"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'new', label: 'Oxirgi o‘zgargan' },
            { value: 'leads', label: 'Ko‘p lid (7 kun)' },
            { value: 'clicks', label: 'Ko‘p click (7 kun)' },
            { value: 'cr', label: 'Yuqori konversiya' },
            { value: 'name', label: 'Nomi bo‘yicha' },
          ]}
        />
      </div>

      {selRows.length ? (
        <div className="a-bulk">
          <b>{selRows.length} ta tanlandi</b>
          <button
            type="button"
            className="a-btn sm"
            onClick={() => setSelected(new Set(rows.map((l) => l.id)))}
            disabled={rows.every((l) => selected.has(l.id))}
          >
            Ko‘rinayotganlarni tanlash ({rows.length})
          </button>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="a-btn sm p"
            disabled={bulk.isPending || selRows.every((l) => l.active)}
            onClick={() => bulk.mutate({ ids: selRows.filter((l) => !l.active).map((l) => l.id), active: true })}
          >
            Yoqish
          </button>
          <button
            type="button"
            className="a-btn sm"
            disabled={bulk.isPending || selRows.every((l) => !l.active)}
            onClick={() => bulk.mutate({ ids: selRows.filter((l) => l.active).map((l) => l.id), active: false })}
          >
            O‘chirish (yashirish)
          </button>
          <button type="button" className="a-icon-btn" title="Tanlovni bekor qilish" onClick={() => setSelected(new Set())}>
            <IconX size={16} />
          </button>
        </div>
      ) : null}

      {!q.isLoading && filtered && !rows.length ? (
        <p className="muted">Filtr bo‘yicha landing topilmadi.</p>
      ) : null}

      <div className="a-lgrid">
        {rows.map((l) => (
          <div className={`a-lcard${l.active ? '' : ' off'}${selected.has(l.id) ? ' sel' : ''}`} key={l.id}>
            <Link to={`/landings/${l.id}`} className="a-lthumb">
              {l.content.images[0] ? <img src={imgSrc(l.content.images[0])} alt="" loading="lazy" /> : null}
              <span className="a-lbadge">{templateLabel(l.template)}</span>
            </Link>
            <label className="a-lsel" title="Tanlash">
              <input type="checkbox" checked={selected.has(l.id)} onChange={() => pick(l.id)} />
            </label>
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
                <span title={l.active ? 'Faol — o‘chirish' : 'O‘chiq — yoqish'}>
                  <Toggle
                    checked={l.active}
                    disabled={toggle.isPending}
                    onChange={() => toggle.mutate(l)}
                  />
                </span>
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
                <Link
                  className="a-icon-btn"
                  to={`/rotations/new?base=${l.id}`}
                  title="Shu mahsulotdan rotatsiya (A/B test) yaratish"
                >
                  <IconRefresh size={16} />
                </Link>
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
                    onClick={() => askRemove(l)}
                  >
                    <IconTrash size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        <Link className="a-lnew" to="/templates">
          <span><IconSparkles size={22} /></span>
          <strong>Shablondan landing qo‘shish</strong>
          <small>Market katalogidan mahsulotni tanlaysiz — matn va rasm tayyor keladi</small>
        </Link>
      </div>

    </div>
  );
}
