import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { IconCheck, IconX } from './icons';

/* ------------------------------------------------------------------ Toggle */

/** Brauzer checkbox'i o'rniga — panel uslubidagi switch. */
export function Toggle({
  checked,
  onChange,
  disabled,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  hint?: ReactNode;
}) {
  const sw = (
    <span className="a-toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span />
    </span>
  );
  if (!label) return sw;
  return (
    <label className={disabled ? 'a-switch-row off' : 'a-switch-row'}>
      <span>
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
      {sw}
    </label>
  );
}

/* ----------------------------------------------------------------- Confirm */

type ConfirmOpts = {
  title: string;
  text?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type Pending = ConfirmOpts & { resolve: (v: boolean) => void };

const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);

/** window.confirm o'rniga — panel uslubidagi modal. */
export function useConfirm() {
  return useContext(ConfirmCtx);
}

function ConfirmDialog({ pending, done }: { pending: Pending; done: (v: boolean) => void }) {
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') done(false);
      if (e.key === 'Enter') done(true);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [done]);

  return (
    <div className="a-modal-back" onClick={() => done(false)}>
      <div
        className="a-modal a-confirm"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="a-modal-h">
          <h2>{pending.title}</h2>
          <button className="a-icon-btn" type="button" onClick={() => done(false)} aria-label="Yopish">
            <IconX />
          </button>
        </div>
        {pending.text ? <p className="a-confirm-t">{pending.text}</p> : null}
        <div className="a-row" style={{ justifyContent: 'flex-end', margin: 0 }}>
          <button className="a-btn" type="button" onClick={() => done(false)}>
            {pending.cancelText || 'Bekor qilish'}
          </button>
          <button
            ref={okRef}
            className={pending.danger ? 'a-btn danger' : 'a-btn p'}
            type="button"
            onClick={() => done(true)}
          >
            {pending.confirmText || 'Ha'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Toast */

type Toast = { id: number; kind: 'ok' | 'err'; text: string };

const ToastCtx = createContext<{ ok: (t: string) => void; err: (t: string) => void }>({
  ok: () => {},
  err: () => {},
});

/** alert() o'rniga — pastki o'ngda chiqib, o'zi yo'qoladigan xabar. */
export function useToast() {
  return useContext(ToastCtx);
}

/** Barcha umumiy UI (confirm + toast) shu provayder ostida ishlaydi. */
export function UiProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const confirm = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })),
    [],
  );

  const done = useCallback(
    (v: boolean) => {
      setPending((p) => {
        p?.resolve(v);
        return null;
      });
    },
    [],
  );

  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'err' ? 6000 : 3500);
  }, []);

  const toast = useMemo(
    () => ({ ok: (t: string) => push('ok', t), err: (t: string) => push('err', t) }),
    [push],
  );

  return (
    <ConfirmCtx.Provider value={confirm}>
      <ToastCtx.Provider value={toast}>
        {children}
        {pending ? <ConfirmDialog pending={pending} done={done} /> : null}
        {toasts.length ? (
          <div className="a-toasts" role="status" aria-live="polite">
            {toasts.map((t) => (
              <div className={`a-toast ${t.kind}`} key={t.id}>
                {t.kind === 'ok' ? <IconCheck size={15} /> : <IconX size={15} />}
                <span>{t.text}</span>
                <button
                  type="button"
                  aria-label="Yopish"
                  onClick={() => setToasts((x) => x.filter((v) => v.id !== t.id))}
                >
                  <IconX size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </ToastCtx.Provider>
    </ConfirmCtx.Provider>
  );
}
