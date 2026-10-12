/** Meta Conversions API — brauzer orqali serverga (dedup event_id) */

export function getMetaCookies() {
  const read = (name: string) => {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : '';
  };
  return { fbp: read('_fbp'), fbc: read('_fbc') };
}

export function newEventId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function sendCapiEvent(opts: {
  eventName: string;
  eventId?: string;
  contentName?: string;
  page?: string;
}) {
  const { fbp, fbc } = getMetaCookies();
  const body = {
    event_name: opts.eventName,
    event_id: opts.eventId,
    event_source_url: location.href.split('#')[0],
    page: opts.page || location.pathname,
    content_name: opts.contentName,
    fbp: fbp || undefined,
    fbc: fbc || undefined,
  };

  try {
    const json = JSON.stringify(body);
    if (navigator.sendBeacon?.('/api/meta/event', new Blob([json], { type: 'application/json' }))) {
      return;
    }
  } catch {
    /* fallthrough */
  }

  fetch('/api/meta/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}
