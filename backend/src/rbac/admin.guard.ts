import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = (req.headers['authorization'] || '') as string;
    const token = auth.replace(/^Bearer\s+/i, '');
    try {
      const payload: any = this.jwt.verify(token);
      return payload?.role === 'admin';
    } catch {
      return false;
    }
  }
}
