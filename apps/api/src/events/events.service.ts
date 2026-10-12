import { Injectable } from '@nestjs/common';
import { UAParser } from 'ua-parser-js';
import { normAccount } from '../common/account';
import { PrismaService } from '../prisma/prisma.service';

type InEvent = {
  type: string;
  elId?: string;
  elText?: string;
  scrollPct?: number;
  dwellMs?: number;
};

type InMeta = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  referrer?: string;
  ua?: string;
  page?: string;
  account?: string;
};

/** kadr yo‘lini normalizatsiya qiladi */
function normPage(raw: string): string {
  const p = raw.split('?')[0].replace(/\/+$/, '');
  return p || '/';
}

function clip(v: unknown, n: number): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  return s.slice(0, n);
}

function classifyBrowser(ua: string): string {
  const lower = ua.toLowerCase();
  if (/instagram/.test(lower)) return 'instagram';
  if (/fbav|fban|facebook/.test(lower)) return 'facebook';
  const p = new UAParser(ua).getResult();
  return (p.browser.name || 'other').toLowerCase();
}

function classifyDevice(ua: string): string {
  const p = new UAParser(ua).getResult();
  const t = (p.device.type || '').toLowerCase();
  if (t === 'tablet' || /ipad|tablet/.test(ua.toLowerCase())) return 'tablet';
  if (t === 'mobile' || /iphone|android.*mobile|mobile/.test(ua.toLowerCase()))
    return 'mobile';
  return t || 'desktop';
}

function classifyOs(ua: string): string {
  const p = new UAParser(ua).getResult();
  return (p.os.name || 'other').replace(/\s+/g, '');
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(payload: { sid?: string; events?: InEvent[]; meta?: InMeta }) {
    const sid = clip(payload.sid, 64);
    if (!sid || !Array.isArray(payload.events) || !payload.events.length) {
      return { ok: false };
    }

    const meta = payload.meta || {};
    const ua = clip(meta.ua, 300) || '';
    const rawPage = clip(meta.page, 120) || '/';
    const account = normAccount(meta.account);
    const page = normPage(rawPage);
    const now = new Date();

    const events = payload.events.slice(0, 50).filter((e) => e?.type);
    const hasCta = events.some((e) => e.type === 'cta');
    let maxScroll = 0;
    let dwellMs = 0;
    for (const e of events) {
      if (typeof e.scrollPct === 'number' && e.scrollPct > maxScroll) {
        maxScroll = Math.min(100, Math.max(0, Math.round(e.scrollPct)));
      }
      if (e.type === 'exit' && typeof e.dwellMs === 'number') {
        dwellMs = Math.max(
          dwellMs,
          Math.min(3_600_000, Math.max(0, Math.round(e.dwellMs))),
        );
      }
    }

    let session = await this.prisma.session.findUnique({ where: { sid } });
    if (!session) {
      session = await this.prisma.session.create({
        data: {
          sid,
          page,
          account,
          utmSource: clip(meta.utmSource, 60),
          utmMedium: clip(meta.utmMedium, 60),
          utmCampaign: clip(meta.utmCampaign, 80),
          utmContent: clip(meta.utmContent, 80),
          referrer: clip(meta.referrer, 300),
          ua,
          device: ua ? classifyDevice(ua) : null,
          browser: ua ? classifyBrowser(ua) : null,
          os: ua ? classifyOs(ua) : null,
          maxScroll,
          dwellMs,
          converted: hasCta,
          firstSeen: now,
          lastSeen: now,
        },
      });
    } else {
      session = await this.prisma.session.update({
        where: { id: session.id },
        data: {
          lastSeen: now,
          page,
          converted: hasCta || session.converted,
          maxScroll: Math.max(session.maxScroll, maxScroll),
          dwellMs: Math.max(session.dwellMs, dwellMs),
        },
      });
    }

    await this.prisma.event.createMany({
      data: events.map((e) => ({
        sessionId: session!.id,
        type: clip(e.type, 40) || 'unknown',
        elId: clip(e.elId, 60),
        elText: clip(e.elText, 80),
        scrollPct:
          typeof e.scrollPct === 'number'
            ? Math.min(100, Math.max(0, Math.round(e.scrollPct)))
            : null,
        dwellMs:
          typeof e.dwellMs === 'number'
            ? Math.min(3_600_000, Math.max(0, Math.round(e.dwellMs)))
            : null,
      })),
    });

    return { ok: true };
  }
}
