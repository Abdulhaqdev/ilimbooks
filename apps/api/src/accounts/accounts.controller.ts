import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { type AccountInput, AccountsService } from './accounts.service';

@Controller('api/admin/accounts')
@UseGuards(AdminAuthGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list() {
    return this.accounts.list();
  }

  @Post()
  create(@Body() body: AccountInput) {
    return this.accounts.create(body || {});
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() body: AccountInput) {
    return this.accounts.update(code, body || {});
  }
}
