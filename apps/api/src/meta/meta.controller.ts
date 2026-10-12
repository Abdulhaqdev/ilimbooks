import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { MetaCapiService } from './meta-capi.service';

type EventBody = {
  event_name?: string;
  event_id?: string;
  event_source_url?: string;
  page?: string;
  content_name?: string;
  fbp?: string;
  fbc?: string;
};

function clientIp(req: Request): string | undefined {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd[0]) return fwd[0].split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || undefined;
}

@Controller('api/meta')
export class MetaController {
  constructor(private readonly capi: MetaCapiService) {}

  @Get('status')
  async status() {
    return { ok: true, capi: await this.capi.enabled() };
  }

  /** Brauzer → server → Meta CAPI (Lead / PageView dedup event_id bilan) */
  @Post('event')
  @HttpCode(204)
  async event(@Req() req: Request, @Body() body: EventBody) {
    const name = String(body.event_name || '').trim();
    if (!name || !/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(name)) return;

    const landing =
      process.env.LANDING_URL?.replace(/\/$/, '') || 'https://ilimbooks.uz';
    const page = String(body.page || '/').split('?')[0] || '/';
    const path = page.startsWith('/') ? page : `/${page}`;
    const sourceUrl =
      String(body.event_source_url || '').trim() ||
      `${landing}${path === '/' ? '' : path}`;

    const custom: Record<string, string | number> = {};
    const cn = String(body.content_name || '').trim();
    if (cn) custom.content_name = cn.slice(0, 120);

    await this.capi.sendEvent({
      eventName: name,
      eventId: body.event_id?.trim(),
      eventSourceUrl: sourceUrl,
      page: path,
      userAgent: req.headers['user-agent'] || '',
      clientIp: clientIp(req),
      fbp: body.fbp?.trim(),
      fbc: body.fbc?.trim(),
      customData: Object.keys(custom).length ? custom : undefined,
    });
  }
}
