import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { accountLabel, getAccount } from '../lib/account';
import { api } from '../lib/api';
import { landingUrl, templateLabel, type Landing } from '../lib/landings';
import { IconCheck, IconExternal } from '../components/icons';

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallthrough */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function buildUrl(
  path: string,
  slug: string,
  source: string,
  medium: string,
  campaign: string,
) {
  const u = new URL(landingUrl(path));
  if (source.trim()) u.searchParams.set('utm_source', source.trim());
  if (medium.trim()) u.searchParams.set('utm_medium', medium.trim());
  if (campaign.trim()) u.searchParams.set('utm_campaign', campaign.trim());
  u.searchParams.set('utm_content', slug);
  return u.toString();
}

export default function Reklama() {
  const account = getAccount();
  const [source, setSource] = useState('instagram');
  const [medium, setMedium] = useState('cpc');
  const [campaign, setCampaign] = useState('');
  const [copied, setCopied] = useState('');
  const q = useQuery({
    queryKey: ['landings'],
    queryFn: () => api<Landing[]>('/api/admin/landings'),
  });

  const links = useMemo(
    () =>
      (q.data || [])
        .filter((l) => l.active)
        .map((l) => {
          const slug = l.slug || 'home';
          return {
            slug,
            name: l.name,
            path: l.path,
            note: templateLabel(l.template),
            url: buildUrl(l.path, slug, source, medium, campaign),
          };
        }),
    [q.data, source, medium, campaign],
  );

  async function copy(url: string, key: string) {
    const ok = await copyText(url);
    setCopied(ok ? key : '');
    setTimeout(() => setCopied(''), 1600);
  }

  async function copyAll() {
    const text = links.map((l) => `${l.name} (${l.path})\n${l.url}`).join('\n\n');
    await copy(text, 'all');
  }

  return (
    <div>
      <h1 className="a-h1">Reklama · {accountLabel(account)}</h1>
      <p className="a-sub">Har bir kadr — alohida link, alohida statistika.</p>

      <div className="a-panel">
        <div className="a-panel-h">
          <span>Reklama havolalari</span>
          <button className="a-btn sm" type="button" onClick={copyAll}>
            {copied === 'all' ? (
              <>
                <IconCheck size={14} /> Nusxalandi
              </>
            ) : (
              'Hammasini nusxalash'
            )}
          </button>
        </div>
        <div className="a-panel-b">
          <div className="a-row" style={{ alignItems: 'end' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="a-lbl">Manba · utm_source</label>
              <input className="a-in" value={source} onChange={(e) => setSource(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="a-lbl">Turi · utm_medium</label>
              <input className="a-in" value={medium} onChange={(e) => setMedium(e.target.value)} />
            </div>
            <div style={{ flex: 1.4, minWidth: 180 }}>
              <label className="a-lbl">Kampaniya · utm_campaign</label>
              <input
                className="a-in"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="masalan: avgust_reels"
              />
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
            {links.map((l) => (
              <div key={l.slug}>
                <div className="a-row spread" style={{ marginBottom: 8 }}>
                  <div>
                    <strong>{l.name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {l.path} · {l.note} · utm_content={l.slug}
                    </div>
                  </div>
                  <div className="a-row" style={{ margin: 0 }}>
                    <button className="a-btn sm" type="button" onClick={() => copy(l.url, l.slug)}>
                      {copied === l.slug ? (
                        <>
                          <IconCheck size={14} /> Nusxalandi
                        </>
                      ) : (
                        'Nusxalash'
                      )}
                    </button>
                    <a className="a-btn sm" href={l.url} target="_blank" rel="noreferrer">
                      Ochish <IconExternal size={14} />
                    </a>
                  </div>
                </div>
                <code
                  className="a-in mono"
                  style={{ display: 'block', fontSize: 12.5, wordBreak: 'break-all' }}
                >
                  {l.url}
                </code>
              </div>
            ))}
          </div>

          <p className="muted" style={{ marginTop: 16, fontSize: 12.5, lineHeight: 1.6 }}>
            Har kadr uchun alohida reklama joyiga qo‘ying. Tugma bosilganda bot{' '}
            <code>?start=…</code> orqali qaysi kadr ekanini ko‘radi.
          </p>
        </div>
      </div>
    </div>
  );
}
