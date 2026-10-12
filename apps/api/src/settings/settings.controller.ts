import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { normAccount } from '../common/account';
import { SettingsService } from './settings.service';

@Controller('api/admin')
@UseGuards(AdminAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('settings')
  async adminGet(@Query('acc') acc?: string) {
    const account = normAccount(acc);
    return { ok: true, account, values: await this.settings.getAll(account) };
  }

  @Patch('settings')
  async adminPatch(@Body() body: Record<string, unknown>, @Query('acc') acc?: string) {
    const raw =
      body && typeof body.values === 'object' && body.values
        ? (body.values as Record<string, unknown>)
        : body || {};
    const values = await this.settings.patch(normAccount(acc), raw);
    return { ok: true, values };
  }

  @Get('pixel/check')
  pixelCheck(@Query('id') id = '') {
    return this.settings.checkPixel(String(id));
  }

  @Post('capi/check')
  capiCheck(@Body() body: { token?: string; pixelId?: string }) {
    return this.settings.checkCapi(String(body?.token || ''), String(body?.pixelId || ''));
  }
}
