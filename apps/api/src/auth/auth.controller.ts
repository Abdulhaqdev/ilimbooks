import {
  Body,
  Controller,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/admin')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: { username?: string; password?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const username = (body.username || '').trim();
    const password = body.password || '';
    const user = await this.prisma.adminUser.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Login yoki parol noto‘g‘ri');
    }
    const token = await this.jwt.signAsync({ sub: user.id });
    const secure = process.env.NODE_ENV === 'production';
    res.cookie('adm', token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('adm', { path: '/' });
    return { ok: true };
  }
}
