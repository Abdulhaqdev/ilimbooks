import { Injectable, Logger } from '@nestjs/common';
import { LandingsService } from '../landings/landings.service';
import { parsePixelIds, SettingsService } from '../settings/settings.service';

export type CapiEventInput = {
  eventName: string;
  eventId?: string;
  eventSourceUrl: string;
  page: string;
  userAgent?: string;
  clientIp?: string;
  fbp?: string;
  fbc?: string;
  customData?: Record<string, string | number>;
};

@Injectable()
export class MetaCapiService {
  private readonly log = new Logger(MetaCapiService.name);

  constructor(
    private readonly settings: SettingsService,
    private readonly landings: LandingsService,
  ) {}

  /** Token: admin → Sozlamalar (yoki .env META_CAPI_ACCESS_TOKEN). Pixel: landing → standart → .env. */
  private async config(page: string) {
    const s = await this.settings.getAll();
    const landing = await this.landings.findByPath(page);
    const token = s.meta_capi_token || process.env.META_CAPI_ACCESS_TOKEN?.trim() || '';
    const pixelId =
      parsePixelIds(landing?.pixelId || '')[0] ||
      parsePixelIds(s.meta_pixel)[0] ||
      process.env.META_PIXEL_ID?.trim() ||
      '';
    return { token, pixelId };
  }

  async enabled() {
    const { token, pixelId } = await this.config('/');
    return !!token && !!pixelId;
  }

  /** Meta Conversions API — https://developers.facebook.com/docs/marketing-api/conversions-api */
  async sendEvent(input: CapiEventInput) {
    const { token, pixelId } = await this.config(input.page);
    if (!token || !pixelId) {
      return { ok: false, skipped: true, reason: 'not_configured' };
    }

    const userData: Record<string, string> = {};
    if (input.clientIp) userData.client_ip_address = input.clientIp;
    if (input.userAgent) userData.client_user_agent = input.userAgent.slice(0, 512);
    if (input.fbp) userData.fbp = input.fbp.slice(0, 256);
    if (input.fbc) userData.fbc = input.fbc.slice(0, 256);

    const row: Record<string, unknown> = {
      event_name: input.eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: input.eventSourceUrl.slice(0, 2048),
    };
    if (input.eventId) row.event_id = input.eventId.slice(0, 128);
    if (Object.keys(userData).length) row.user_data = userData;
    if (input.customData && Object.keys(input.customData).length) {
      row.custom_data = input.customData;
    }

    try {
      const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [row] }),
        signal: AbortSignal.timeout(9000),
      });
      const json = (await res.json().catch(() => ({}))) as {
        events_received?: number;
        error?: { message?: string };
      };
      if (!res.ok) {
        this.log.warn(`CAPI ${input.eventName} failed: ${json.error?.message || res.status}`);
        return { ok: false, error: json.error?.message || String(res.status) };
      }
      return { ok: true, received: json.events_received ?? 1 };
    } catch (e) {
      this.log.warn(`CAPI ${input.eventName} error: ${e}`);
      return { ok: false, error: 'network' };
    }
  }
}
