import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Request, Response } from 'express';
import { AccountsService } from '../accounts/accounts.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { RotationsService, variantCookieName } from '../rotations/rotations.service';
import { type LandingInput, LandingsService } from './landings.service';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

const VIDEO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

const MB = 1024 * 1024;

type UploadFile = { mimetype: string; size: number; buffer: Buffer };

@Controller('api')
export class LandingsController {
  constructor(
    private readonly landings: LandingsService,
    private readonly accounts: AccountsService,
    private readonly rotations: RotationsService,
  ) {}

  /**
   * Sahifa kontenti. Avval oddiy landing, bo'lmasa rotatsiya (bitta havola —
   * ichida bir nechta landing navbat bilan). Tanlangan variant cookie'ga yoziladi,
   * shuning uchun sahifa yangilanganda landing almashib ketmaydi.
   */
  @Get('public/landing')
  async publicLanding(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('path') path = '/',
  ) {
    const l = await this.landings.getPublicByPath(path);
    if (l) return l;

    const picked = await this.rotations.resolvePublic(
      path,
      (req.cookies as Record<string, string>) || {},
    );
    if (!picked) throw new NotFoundException('Sahifa topilmadi');

    res.setHeader('Cache-Control', 'no-store');
    res.cookie(variantCookieName(picked.rotationId), picked.landingId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return picked.payload;
  }

  @Get('admin/landings')
  @UseGuards(AdminAuthGuard)
  async list(@Query('acc') acc?: string) {
    return this.landings.list(await this.accounts.resolve(acc));
  }

  @Get('admin/presets')
  @UseGuards(AdminAuthGuard)
  presets() {
    return this.landings.presets();
  }

  @Get('admin/landings/:id')
  @UseGuards(AdminAuthGuard)
  async get(@Param('id') id: string, @Query('acc') acc?: string) {
    return this.landings.get(id, await this.accounts.resolve(acc));
  }

  @Post('admin/landings')
  @UseGuards(AdminAuthGuard)
  async create(@Body() body: LandingInput, @Query('acc') acc?: string) {
    return this.landings.create(await this.accounts.resolve(acc), body || {});
  }

  @Patch('admin/landings/:id')
  @UseGuards(AdminAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() body: LandingInput,
    @Query('acc') acc?: string,
  ) {
    return this.landings.update(id, body || {}, await this.accounts.resolve(acc));
  }

  @Post('admin/landings/:id/duplicate')
  @UseGuards(AdminAuthGuard)
  async duplicate(@Param('id') id: string, @Query('acc') acc?: string) {
    return this.landings.duplicate(id, await this.accounts.resolve(acc));
  }

  @Delete('admin/landings/:id')
  @UseGuards(AdminAuthGuard)
  async remove(@Param('id') id: string, @Query('acc') acc?: string) {
    return this.landings.remove(id, await this.accounts.resolve(acc));
  }

  @Post('admin/upload')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * MB } }))
  async upload(@UploadedFile() file?: UploadFile) {
    if (!file) throw new BadRequestException('Fayl tanlanmadi');
    const ext = IMAGE_EXT[file.mimetype] || VIDEO_EXT[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Faqat rasm (jpg, png, webp, gif, avif) yoki video (mp4, webm) yuklash mumkin');
    }
    if (IMAGE_EXT[file.mimetype] && file.size > 5 * MB) {
      throw new BadRequestException('Rasm hajmi 5 MB dan oshmasin');
    }
    await mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${randomUUID()}.${ext}`;
    await writeFile(join(UPLOAD_DIR, name), file.buffer);
    return { ok: true, url: `/api/uploads/${name}` };
  }
}
