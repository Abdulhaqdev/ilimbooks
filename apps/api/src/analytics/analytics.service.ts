import { Injectable } from '@nestjs/common';
import { Account } from '../common/account';
import { LandingsService } from '../landings/landings.service';
import { PrismaService } from '../prisma/prisma.service';

export type RangeKey = '24h' | '3d' | '7d' | '30d';

type PageRef = { path: string; name: string; template: string; slug: string };

const TEMPLATE_LABEL: Record<string, string> = { full: "To'liq sahifa", compact: 'Bitta ekran' };

function buildPageStats(sessions: { page: string; converted: boolean }[], pages: PageRef[]) {
  const map = new Map<string, { sessions: number; clicks: number }>();
  for (const p of pages) map.set(p.path, { sessions: 0, clicks: 0 });
  for (const s of sessions) {
    const cur = map.get(s.page);
    if (!cur) continue;
    cur.sessions++;
    if (s.converted) cur.clicks++;
  }
  return pages.map((p) => {
    const cur = map.get(p.path)!;
    return {
      page: p.path,
      name: p.name,
      note: TEMPLATE_LABEL[p.template] || p.template,
      slug: p.slug || 'home',
      sessions: cur.sessions,
      viewers: cur.sessions,
      clicks: cur.clicks,
      clickUsers: cur.clicks,
      cr: cur.sessions > 0 ? Math.round((cur.clicks / cur.sessions) * 10000) / 100 : 0,
    };
  });
}

export function rangeToDate(range: string): Date {
  const now = Date.now();
  const map: Record<string, number> = {
    '24h': 24 * 3600_000,
    '3d': 3 * 24 * 3600_000,
    '7d': 7 * 24 * 3600_000,
    '30d': 30 * 24 * 3600_000,
  };
  return new Date(now - (map[range] || map['24h']));
}

/** Asia/Tashkent — UTC+5 (DST yo‘q) */
export const TZ_OFFSET_MS = 5 * 3600_000;

export type TimeWindow = {
  since: Date;
  until: Date;
  isDay: boolean;
  range: string;
  day?: string;
};

/** range yoki aniq kun (YYYY-MM-DD, Toshkent vaqti) bo‘yicha oyna hisoblaydi. */
export function resolveWindow(range?: string, day?: string): TimeWindow {
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const start = new Date(`${day}T00:00:00.000+05:00`);
    if (!Number.isNaN(start.getTime())) {
      return {
        since: start,
        until: new Date(start.getTime() + 86_400_000),
        isDay: true,
        range: 'day',
        day,
      };
    }
  }
  const r = range || '24h';
  return {
    since: rangeToDate(r),
    until: new Date(Date.now() + 60_000),
    isDay: false,
    range: r,
  };
}

/** ms ni Toshkent vaqtida "DD.MM HH:00" ko‘rinishida */
function hourLabelTashkent(ms: number): string {
  const d = new Date(ms + TZ_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:00`;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly landings: LandingsService,
  ) {}

  private async pageRefs(): Promise<PageRef[]> {
    return (await this.landings.list()).map((l) => ({
      path: l.path,
      name: l.name,
      template: l.template,
      slug: l.slug,
    }));
  }

  async dashboard(win: TimeWindow, account: Account = 'nazir') {
    const since = win.since;
    const until = win.until;
    const onlineSince = new Date(Date.now() - 5 * 60_000);

    const [sessions, online, eventCount, leads] =
      await Promise.all([
        this.prisma.session.findMany({
          where: { firstSeen: { gte: since, lt: until }, account },
          select: {
            id: true,
            sid: true,
            converted: true,
            dwellMs: true,
            firstSeen: true,
            page: true,
          },
        }),
        this.prisma.session.count({
          where: { lastSeen: { gte: onlineSince }, account },
        }),
        this.prisma.event.count({
          where: { createdAt: { gte: since, lt: until }, session: { account } },
        }),
        this.prisma.lead.count({
          where: { createdAt: { gte: since, lt: until } },
        }),
      ]);

    const total = sessions.length;
    const converted = sessions.filter((s) => s.converted).length;
    const avgDwell =
      total > 0
        ? Math.round(
            sessions.reduce((a, s) => a + (s.dwellMs || 0), 0) / total / 1000,
          )
        : 0;
    const cr = total > 0 ? Math.round((converted / total) * 10000) / 100 : 0;
    const leadCr = total > 0 ? Math.round((leads / total) * 10000) / 100 : 0;

    // hourly buckets (Toshkent vaqti)
    const hours: { t: string; sessions: number; conv: number }[] = [];
    const bucketMs = 3600_000;
    const startHour = Math.floor(since.getTime() / bucketMs) * bucketMs;
    const endBound = Math.min(Date.now(), until.getTime() - 1);
    const endHour = Math.floor(endBound / bucketMs) * bucketMs;
    const sessByHour = new Map<number, { s: number; c: number }>();
    for (const s of sessions) {
      const h = Math.floor(s.firstSeen.getTime() / bucketMs) * bucketMs;
      const cur = sessByHour.get(h) || { s: 0, c: 0 };
      cur.s++;
      if (s.converted) cur.c++;
      sessByHour.set(h, cur);
    }
    for (let t = startHour; t <= endHour; t += bucketMs) {
      const cur = sessByHour.get(t) || { s: 0, c: 0 };
      hours.push({ t: hourLabelTashkent(t), sessions: cur.s, conv: cur.c });
    }

    const pageStats = buildPageStats(sessions, await this.pageRefs());

    return {
      range: win.range,
      day: win.day,
      kpis: {
        online,
        sessions: total,
        conversions: converted,
        cr,
        avgDwellSec: avgDwell,
        events: eventCount,
        leads,
        leadCr,
      },
      hours: win.isDay || win.range === '24h' ? hours.slice(-24) : hours,
      pages: pageStats,
    };
  }

  async analytics(win: TimeWindow, account: Account = 'nazir') {
    const { since, until } = win;
    const sessions = await this.prisma.session.findMany({
      where: { firstSeen: { gte: since, lt: until }, account },
      select: {
        id: true,
        converted: true,
        page: true,
        utmContent: true,
        utmCampaign: true,
        utmSource: true,
        device: true,
        browser: true,
        os: true,
      },
    });

    const ctaEvents = await this.prisma.event.findMany({
      where: {
        type: 'cta',
        createdAt: { gte: since, lt: until },
        session: { account },
      },
      select: {
        elId: true,
        elText: true,
        sessionId: true,
        session: { select: { page: true } },
      },
    });

    // creatives
    const creativeMap = new Map<
      string,
      { content: string; campaign: string; sessions: number; conv: number }
    >();
    for (const s of sessions) {
      const content = s.utmContent || '—';
      const campaign = s.utmCampaign || '—';
      const key = `${content}||${campaign}`;
      const cur = creativeMap.get(key) || {
        content,
        campaign,
        sessions: 0,
        conv: 0,
      };
      cur.sessions++;
      if (s.converted) cur.conv++;
      creativeMap.set(key, cur);
    }
    const creatives = [...creativeMap.values()]
      .filter((c) => c.sessions >= 1)
      .map((c) => ({
        ...c,
        cr:
          c.sessions > 0
            ? Math.round((c.conv / c.sessions) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions);

    // buttons
    const btnMap = new Map<
      string,
      { page: string; button: string; text: string; clicks: number; users: Set<string> }
    >();
    for (const e of ctaEvents) {
      const key = `${e.session.page}|${e.elId}|${e.elText}`;
      const cur = btnMap.get(key) || {
        page: e.session.page,
        button: e.elId || 'cta',
        text: e.elText || '',
        clicks: 0,
        users: new Set(),
      };
      cur.clicks++;
      cur.users.add(e.sessionId);
      btnMap.set(key, cur);
    }
    const buttons = [...btnMap.values()]
      .map((b) => ({
        page: b.page,
        button: b.button,
        text: b.text,
        clicks: b.clicks,
        users: b.users.size,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    const countBy = (field: 'device' | 'browser' | 'os' | 'utmSource') => {
      const m = new Map<string, number>();
      for (const s of sessions) {
        const k = (s[field] || '—') as string;
        m.set(k, (m.get(k) || 0) + 1);
      }
      const total = sessions.length || 1;
      return [...m.entries()]
        .map(([name, count]) => ({
          name,
          count,
          pct: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);
    };

    const total = sessions.length;
    const converted = sessions.filter((s) => s.converted).length;

    return {
      range: win.range,
      day: win.day,
      pages: buildPageStats(sessions, await this.pageRefs()),
      creatives,
      buttons,
      devices: countBy('device'),
      browsers: countBy('browser'),
      os: countBy('os'),
      sources: countBy('utmSource'),
    };
  }
}
