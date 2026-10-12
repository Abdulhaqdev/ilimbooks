import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token =
      (req.cookies?.adm as string | undefined) ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined);
    if (!token) throw new UnauthorizedException('Unauthorized');
    try {
      const payload = this.jwt.verify<{ sub: string }>(token);
      (req as Request & { adminId?: string }).adminId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
  }
}
