import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { normAccount } from '../common/account';
import { AnalyticsService, resolveWindow } from './analytics.service';

@Controller('api/admin')
@UseGuards(AdminAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  dashboard(
    @Query('range') range = '24h',
    @Query('day') day?: string,
    @Query('acc') acc?: string,
  ) {
    return this.analytics.dashboard(resolveWindow(range, day), normAccount(acc));
  }

  @Get('analytics')
  analyticsData(
    @Query('range') range = '7d',
    @Query('day') day?: string,
    @Query('acc') acc?: string,
  ) {
    return this.analytics.analytics(resolveWindow(range, day), normAccount(acc));
  }
}
