import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LANDING_URL } from '../lib/api';
import { IconExternal, IconRefresh } from './icons';

type Device = {
  id: string;
  label: string;
  note: string;
  kind: 'android' | 'ios';
  w: number;
  h: number;
  bezel: number;
  radius: number;
  status: number;
  top: number;
  bottom: number;
};

/** Ekran o'lchamlari CSS pikselda — brauzer shu o'lchamni ko'radi, media query'lar real telefondagidek ishlaydi. */
const DEVICES: Device[] = [
  { id: 'android', label: 'Android', note: 'Galaxy A seriya (eng ommabop)', kind: 'android', w: 360, h: 800, bezel: 10, radius: 40, status: 28, top: 56, bottom: 20 },
  { id: 'iphone', label: 'iPhone 15', note: 'iPhone 15 / 14 Pro', kind: 'ios', w: 393, h: 852, bezel: 12, radius: 56, status: 54, top: 0, bottom: 78 },
  { id: 'max', label: 'Pro Max', note: 'iPhone 15 Pro Max', kind: 'ios', w: 430, h: 932, bezel: 12, radius: 60, status: 54, top: 0, bottom: 78 },
];

const STORE_KEY = 'adm-preview-device';

function useClock() {
  const fmt = () =>
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Tashkent' }).format(new Date());
  const [t, setT] = useState(fmt);
  useEffect(() => {
    const i = setInterval(() => setT(fmt()), 20_000);
    return () => clearInterval(i);
  }, []);
  return t.replace(/^0/, '');
}

function StatusIcons() {
  return (
    <span className="a-dev-icons" aria-hidden="true">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
        <rect x="0" y="8" width="3" height="4" rx="1" />
        <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
        <rect x="10" y="3" width="3" height="9" rx="1" />
        <rect x="15" y="0" width="3" height="12" rx="1" />
      </svg>
      <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
        <path d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.8 10.8 0 0 0 8 .4 10.8 10.8 0 0 0 .5 3.4l1.2 1.3A9 9 0 0 1 8 2.2Z" />
        <path d="M8 5.6c1.5 0 2.9.6 4 1.6l1.2-1.3A7.4 7.4 0 0 0 8 3.8c-2 0-3.8.8-5.2 2.1L4 7.2a5.7 5.7 0 0 1 4-1.6Z" />
        <path d="M8 9c.6 0 1.2.2 1.7.7L8 11.6 6.3 9.7C6.8 9.2 7.4 9 8 9Z" />
      </svg>
      <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
        <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" opacity="0.45" />
        <rect x="2" y="2" width="17" height="9" rx="2" fill="currentColor" />
        <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="currentColor" opacity="0.5" />
      </svg>
    </span>
  );
}

export type PreviewLanding = { path: string; template: string; content: unknown };

const PREVIEW_SRC = `${LANDING_URL.replace(/\/$/, '')}/?preview=1`;
const PREVIEW_ORIGIN = new URL(LANDING_URL).origin;

/** Landingni iframe ichida ko'rsatadi va har o'zgarishda ma'lumotni postMessage orqali yuboradi. */
export function PhonePreview({ url, landing }: { url: string; landing: PreviewLanding | null }) {
  const [devId, setDevId] = useState(() => localStorage.getItem(STORE_KEY) || DEVICES[0].id);
  const dev = DEVICES.find((d) => d.id === devId) || DEVICES[0];
  const [reloadKey, setReloadKey] = useState(0);
  const clock = useClock();
  const frameRef = useRef<HTMLIFrameElement>(null);

  const landingRef = useRef(landing);
  landingRef.current = landing;
  const post = useCallback(() => {
    const l = landingRef.current;
    if (!l) return;
    frameRef.current?.contentWindow?.postMessage({ type: 'ib-preview', landing: { ...l, pixelId: '' } }, PREVIEW_ORIGIN);
  }, []);

  useEffect(() => {
    const t = setTimeout(post, 120);
    return () => clearTimeout(t);
  }, [landing, post]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin === PREVIEW_ORIGIN && e.source === frameRef.current?.contentWindow && e.data?.type === 'ib-preview-ready') post();
    };
    addEventListener('message', onMsg);
    return () => removeEventListener('message', onMsg);
  }, [post]);

  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const outerW = dev.w + dev.bezel * 2;
  const outerH = dev.h + dev.bezel * 2;
  const scale = box.w ? Math.min(1, box.w / outerW, box.h / outerH) : 0;
  const viewportH = dev.h - dev.status - dev.top - dev.bottom;
  const host = url.replace(/^https?:\/\//, '').replace(/\/$/, '') || url;
  const domain = host.split('/')[0];

  const pick = (id: string) => {
    setDevId(id);
    localStorage.setItem(STORE_KEY, id);
  };

  return (
    <div className="a-pv">
      <div className="a-pv-bar">
        <div className="a-seg">
          {DEVICES.map((d) => (
            <button key={d.id} type="button" className={d.id === dev.id ? 'on' : ''} onClick={() => pick(d.id)} title={d.note}>
              {d.label}
            </button>
          ))}
        </div>
        <div className="a-pv-tools">
          <button type="button" className="a-icon-btn" title="Qayta yuklash" onClick={() => setReloadKey((k) => k + 1)}>
            <IconRefresh size={16} />
          </button>
          <a className="a-icon-btn" href={url} target="_blank" rel="noreferrer" title="Yangi oynada ochish">
            <IconExternal size={16} />
          </a>
        </div>
      </div>

      <div className="a-pv-stage" ref={stageRef}>
        <div className="a-pv-fit" style={{ width: outerW * scale, height: outerH * scale, opacity: scale ? 1 : 0 }}>
          <div
            className={`a-dev a-dev-${dev.kind}`}
            style={{
              width: outerW,
              height: outerH,
              padding: dev.bezel,
              borderRadius: dev.radius + dev.bezel,
              transform: `scale(${scale})`,
            }}
          >
            <span className="a-dev-btn a-dev-btn-power" />
            <span className="a-dev-btn a-dev-btn-vol1" />
            <span className="a-dev-btn a-dev-btn-vol2" />
            <div className="a-dev-screen" style={{ borderRadius: dev.radius }}>
              <div className="a-dev-status" style={{ height: dev.status }}>
                <span className="a-dev-time">{clock}</span>
                {dev.kind === 'ios' ? <span className="a-dev-island" /> : <span className="a-dev-punch" />}
                <StatusIcons />
              </div>

              {dev.kind === 'android' && (
                <div className="a-dev-chrome" style={{ height: dev.top }}>
                  <div className="a-dev-omni">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                    <span>{host}</span>
                  </div>
                  <span className="a-dev-tabs">1</span>
                  <span className="a-dev-dots" aria-hidden="true">⋮</span>
                </div>
              )}

              <iframe
                key={reloadKey}
                ref={frameRef}
                title="Landing ko‘rinishi"
                src={PREVIEW_SRC}
                style={{ width: dev.w, height: viewportH }}
              />

              {dev.kind === 'ios' ? (
                <div className="a-dev-safari" style={{ height: dev.bottom }}>
                  <div className="a-dev-pill">
                    <span className="a-dev-aa">
                      <small>A</small>A
                    </span>
                    <span className="a-dev-domain">
                      <svg width="10" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17 10V7A5 5 0 0 0 7 7v3H5v12h14V10h-2ZM9 7a3 3 0 0 1 6 0v3H9V7Z" />
                      </svg>
                      {domain}
                    </span>
                    <IconRefresh size={14} />
                  </div>
                  <span className="a-dev-home" />
                </div>
              ) : (
                <div className="a-dev-nav" style={{ height: dev.bottom }}>
                  <span className="a-dev-home" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="a-hint a-pv-note">
        {dev.note} · {dev.w}×{dev.h}
      </div>
    </div>
  );
}
