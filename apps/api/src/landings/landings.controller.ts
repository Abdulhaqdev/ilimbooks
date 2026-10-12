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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
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
  constructor(private readonly landings: LandingsService) {}

  @Get('public/landing')
  async publicLanding(@Query('path') path = '/') {
    const l = await this.landings.getPublicByPath(path);
    if (!l) throw new NotFoundException('Landing topilmadi');
    return l;
  }

  @Get('admin/landings')
  @UseGuards(AdminAuthGuard)
  list() {
    return this.landings.list();
  }

  @Get('admin/presets')
  @UseGuards(AdminAuthGuard)
  presets() {
    return this.landings.presets();
  }

  @Get('admin/landings/:id')
  @UseGuards(AdminAuthGuard)
  get(@Param('id') id: string) {
    return this.landings.get(id);
  }

  @Post('admin/landings')
  @UseGuards(AdminAuthGuard)
  create(@Body() body: LandingInput) {
    return this.landings.create(body || {});
  }

  @Patch('admin/landings/:id')
  @UseGuards(AdminAuthGuard)
  update(@Param('id') id: string, @Body() body: LandingInput) {
    return this.landings.update(id, body || {});
  }

  @Post('admin/landings/:id/duplicate')
  @UseGuards(AdminAuthGuard)
  duplicate(@Param('id') id: string) {
    return this.landings.duplicate(id);
  }

  @Delete('admin/landings/:id')
  @UseGuards(AdminAuthGuard)
  remove(@Param('id') id: string) {
    return this.landings.remove(id);
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
