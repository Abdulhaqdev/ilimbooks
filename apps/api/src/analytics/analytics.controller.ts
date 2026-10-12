import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { AnalyticsService, resolveWindow } from './analytics.service';

@Controller('api/admin')
@UseGuards(AdminAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly accounts: AccountsService,
  ) {}

  @Get('dashboard')
  async dashboard(
    @Query('range') range = '24h',
    @Query('day') day?: string,
    @Query('acc') acc?: string,
  ) {
    return this.analytics.dashboard(resolveWindow(range, day), await this.accounts.resolve(acc));
  }

  @Get('analytics')
  async analyticsData(
    @Query('range') range = '7d',
    @Query('day') day?: string,
    @Query('acc') acc?: string,
  ) {
    return this.analytics.analytics(resolveWindow(range, day), await this.accounts.resolve(acc));
  }
}
