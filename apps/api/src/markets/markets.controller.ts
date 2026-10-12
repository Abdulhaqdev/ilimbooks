import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { KNOWN_MARKETS, type MarketInput, MarketsService } from './markets.service';

@Controller('api/admin/markets')
@UseGuards(AdminAuthGuard)
export class MarketsController {
  constructor(
    private readonly markets: MarketsService,
    private readonly accounts: AccountsService,
  ) {}

  @Get()
  async list(@Query('acc') acc?: string) {
    return this.markets.list(await this.accounts.resolve(acc));
  }

  @Get('known')
  known() {
    return KNOWN_MARKETS;
  }

  @Post()
  async create(@Body() body: MarketInput, @Query('acc') acc?: string) {
    return this.markets.create(await this.accounts.resolve(acc), body || {});
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: MarketInput) {
    return this.markets.update(id, body || {});
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.markets.remove(id);
  }

  @Post(':id/check')
  check(@Param('id') id: string, @Body() body: { stream?: string; offerId?: string }) {
    return this.markets.check(id, body?.stream, body?.offerId);
  }
}
