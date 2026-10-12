import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { EventsService } from './events.service';

@Controller('api')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post('e')
  @HttpCode(204)
  async ingest(@Req() req: Request, @Body() body: unknown) {
    let payload: {
      sid?: string;
      events?: unknown[];
      meta?: Record<string, unknown>;
    } = {};

    if (typeof body === 'string') {
      try {
        payload = JSON.parse(body);
      } catch {
        return;
      }
    } else if (body && typeof body === 'object') {
      payload = body as typeof payload;
    } else if (typeof req.body === 'string') {
      try {
        payload = JSON.parse(req.body);
      } catch {
        return;
      }
    }

    const meta = { ...(payload.meta || {}) };
    if (!meta.ua) meta.ua = req.headers['user-agent'] || '';
    await this.events.ingest(
      {
        sid: payload.sid,
        events: payload.events as never,
        meta: meta as never,
      },
      (req.cookies as Record<string, string>) || {},
    );
  }
}
