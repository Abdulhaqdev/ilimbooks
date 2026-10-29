import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { resolveWindow } from '../analytics/analytics.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { type RotationInput, RotationsService } from './rotations.service';

@Controller('api/admin/rotations')
@UseGuards(AdminAuthGuard)
export class RotationsController {
  constructor(
    private readonly rotations: RotationsService,
    private readonly accounts: AccountsService,
  ) {}

  @Get()
  async list(@Query('acc') acc?: string) {
    return this.rotations.list(await this.accounts.resolve(acc));
  }

  @Post()
  async create(@Body() body: RotationInput, @Query('acc') acc?: string) {
    return this.rotations.create(await this.accounts.resolve(acc), body || {});
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('acc') acc?: string) {
    return this.rotations.get(id, await this.accounts.resolve(acc));
  }

  @Get(':id/stats')
  async stats(
    @Param('id') id: string,
    @Query('range') range = '7d',
    @Query('day') day?: string,
    @Query('acc') acc?: string,
  ) {
    return this.rotations.stats(id, resolveWindow(range, day), await this.accounts.resolve(acc));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: RotationInput,
    @Query('acc') acc?: string,
  ) {
    return this.rotations.update(id, body || {}, await this.accounts.resolve(acc));
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Query('acc') acc?: string) {
    return this.rotations.remove(id, await this.accounts.resolve(acc));
  }

  @Post(':id/variants')
  async addVariant(
    @Param('id') id: string,
    @Body() body: { landingId?: string },
    @Query('acc') acc?: string,
  ) {
    return this.rotations.addVariant(id, String(body?.landingId || ''), await this.accounts.resolve(acc));
  }

  @Post(':id/template-variants')
  async addTemplateVariants(
    @Param('id') id: string,
    @Body() body: { landingId?: string; templates?: string[] },
    @Query('acc') acc?: string,
  ) {
    return this.rotations.addTemplateVariants(
      id,
      String(body?.landingId || ''),
      body?.templates,
      await this.accounts.resolve(acc),
    );
  }

  @Patch(':id/variants/:variantId')
  async setVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() body: { active?: boolean; weight?: number },
    @Query('acc') acc?: string,
  ) {
    return this.rotations.setVariant(id, variantId, body || {}, await this.accounts.resolve(acc));
  }

  @Post(':id/variants/:variantId/move')
  async move(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() body: { dir?: 'up' | 'down' },
    @Query('acc') acc?: string,
  ) {
    return this.rotations.move(
      id,
      variantId,
      body?.dir === 'up' ? 'up' : 'down',
      await this.accounts.resolve(acc),
    );
  }

  @Delete(':id/variants/:variantId')
  async removeVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Query('acc') acc?: string,
  ) {
    return this.rotations.removeVariant(id, variantId, await this.accounts.resolve(acc));
  }
}
