import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { IconChevronDown } from './icons';

export type Option<T extends string = string> = {
  value: T;
  label: string;
  hint?: string;
  icon?: ReactNode;
};

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
  /** Tugma kengligi: toolbar'da avtomatik, formada 100% */
  block?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
};

/**
 * Brauzerning o'z <select>i o'rniga — panel uslubidagi dropdown.
 * Klaviatura: Enter/Space ochadi, ↑↓ tanlaydi, Enter tasdiqlaydi, Esc yopadi,
 * harf bosilsa shu harfdan boshlanadigan variantga sakraydi.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Tanlang',
  block,
  disabled,
  ariaLabel,
}: Props<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ str: '', at: 0 });

  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    addEventListener('mousedown', onDown);
    return () => removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="1"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function pick(i: number) {
    const o = options[i];
    if (!o) return;
    onChange(o.value);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setActive(options.length - 1);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(active);
      return;
    }
    if (e.key.length === 1) {
      const now = Date.now();
      typed.current.str = now - typed.current.at > 900 ? e.key : typed.current.str + e.key;
      typed.current.at = now;
      const q = typed.current.str.toLowerCase();
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(q));
      if (i >= 0) setActive(i);
    }
  }

  return (
    <div className={block ? 'a-sel block' : 'a-sel'} ref={rootRef}>
      <button
        type="button"
        className={open ? 'a-sel-btn open' : 'a-sel-btn'}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
      >
        {current?.icon ? <span className="a-sel-ic">{current.icon}</span> : null}
        <span className={current ? 'a-sel-val' : 'a-sel-val muted'}>{current?.label || placeholder}</span>
        <IconChevronDown size={15} />
      </button>

      {open ? (
        <ul className="a-sel-pop" role="listbox" id={id} ref={listRef} tabIndex={-1}>
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              data-active={i === active ? '1' : '0'}
              className={[
                'a-sel-opt',
                o.value === value ? 'on' : '',
                i === active ? 'active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(i)}
            >
              {o.icon ? <span className="a-sel-ic">{o.icon}</span> : null}
              <span className="a-sel-opt-t">
                <b>{o.label}</b>
                {o.hint ? <small>{o.hint}</small> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
