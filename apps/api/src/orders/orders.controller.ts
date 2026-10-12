import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { AccountsService } from '../accounts/accounts.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { OrdersService, type OrderInput } from './orders.service';

const VID_COOKIE = 'ib_vid';

@Controller('api')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly accounts: AccountsService,
  ) {}

  /** Public — landing buyurtma formasi */
  @Post('order')
  async create(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    let payload: OrderInput = {};
    if (typeof body === 'string') {
      try {
        payload = JSON.parse(body);
      } catch {
        payload = {};
      }
    } else if (body && typeof body === 'object') {
      payload = body as OrderInput;
    }
    const meta = { ...(payload.meta || {}) };
    if (!meta.ua) meta.ua = req.headers['user-agent'] || '';

    let vid = req.cookies?.[VID_COOKIE] as string | undefined;
    if (!vid || !/^[0-9a-f-]{36}$/.test(vid)) {
      vid = randomUUID();
      res.cookie(VID_COOKIE, vid, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }

    return this.orders.create({ ...payload, meta, vid });
  }

  /** Admin — buyurtmalar ro‘yxati */
  @Get('admin/orders')
  @UseGuards(AdminAuthGuard)
  async list(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('acc') acc?: string,
  ) {
    return this.orders.list({
      status: status || undefined,
      limit: limit ? Number(limit) : undefined,
      account: await this.accounts.resolve(acc),
    });
  }

  /** Admin — uzatilmagan buyurtmani qayta yuborish */
  @Post('admin/orders/:id/retry')
  @UseGuards(AdminAuthGuard)
  async retry(@Param('id') id: string, @Query('acc') acc?: string) {
    return this.orders.retry(id, await this.accounts.resolve(acc));
  }
}
