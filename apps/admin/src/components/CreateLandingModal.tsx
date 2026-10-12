import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { landingUrl, normSlug, templateLabel, type Landing, type Preset } from '../lib/landings';
import { IconX } from './icons';

const slugify = (s: string) => normSlug(s.replace(/[‘’ʻʼ'`]/g, '')).replace(/^-|-$/g, '');

/** Landing faqat tayyor shablondan yaratiladi — market, offer va kontent shundan keladi. */
export function CreateLandingModal({ onClose, preset }: { onClose: () => void; preset: Preset }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState(preset.product);
  const [slug, setSlug] = useState(slugify(preset.product).slice(0, 40));
  const [slugTouched, setSlugTouched] = useState(false);
  const [err, setErr] = useState('');

  const create = useMutation({
    mutationFn: () =>
      api<Landing>('/api/admin/landings', {
        method: 'POST',
        body: JSON.stringify({ name, slug, presetId: preset.id }),
      }),
    onSuccess: (l) => {
      qc.invalidateQueries({ queryKey: ['landings'] });
      nav(`/landings/${l.id}`);
    },
    onError: (e) => setErr(e instanceof Error ? e.message : 'Xatolik'),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (!slug) return setErr('URL manzilini kiriting (masalan: kitob)');
    create.mutate();
  }

  return (
    <div className="a-modal-back" onClick={onClose}>
      <form className="a-modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <div className="a-modal-h">
          <h2>“{preset.name}” shablonidan</h2>
          <button className="a-icon-btn" type="button" onClick={onClose} aria-label="Yopish">
            <IconX />
          </button>
        </div>
        <p className="muted" style={{ margin: '0 0 18px', fontSize: 13.5 }}>
          {templateLabel(preset.template)} dizayni, “{preset.product}” matnlari va rasmlari bilan
          yaratiladi — keyin hammasini o‘zingizga moslab tahrirlaysiz.
        </p>
        <div className="a-f">
          <div>
            <label className="a-lbl" htmlFor="ln">Nomi (faqat adminda ko‘rinadi)</label>
            <input
              id="ln"
              className="a-in"
              autoFocus
              value={name}
              placeholder="Masalan: Husnixat — Reels kampaniyasi"
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value).slice(0, 40));
              }}
            />
          </div>
          <div>
            <label className="a-lbl" htmlFor="ls">URL manzil</label>
            <div className="a-prefix">
              <span>{landingUrl('/').replace(/^https?:\/\//, '')}</span>
              <input
                id="ls"
                value={slug}
                placeholder="kitob"
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(normSlug(e.target.value));
                }}
              />
            </div>
          </div>
          {err ? <div className="a-err">{err}</div> : null}
          <div className="a-row" style={{ justifyContent: 'flex-end', margin: 0 }}>
            <button className="a-btn" type="button" onClick={onClose}>
              Bekor qilish
            </button>
            <button className="a-btn p" type="submit" disabled={create.isPending || !name.trim()}>
              {create.isPending ? 'Yaratilmoqda…' : 'Yaratish va tahrirlash'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
