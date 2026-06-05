import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { WorkspaceRole } from '@prisma/client';
import type { AuthUser } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const user = this.verifyToken(token);
    request.user = user;
    return true;
  }

  private verifyToken(token: string): AuthUser {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('JWT_SECRET is not configured');
    }

    const payload = verify(token, secret);
    if (!payload || typeof payload === 'string') {
      throw new UnauthorizedException('Invalid token');
    }

    const decoded = payload as JwtPayload & {
      user_id: string;
      org_id: string;
      role: string;
      email: string;
    };

    const userId = decoded.user_id ?? decoded.sub;
    const orgId = decoded.org_id;
    const role = decoded.role as WorkspaceRole;
    const email = decoded.email;

    if (!userId || typeof userId !== 'string') {
      throw new UnauthorizedException('Token missing user_id');
    }
    if (!orgId) {
      throw new UnauthorizedException('Token missing org_id');
    }

    return {
      userId,
      orgId,
      role: role ?? WorkspaceRole.MEMBER,
      email: email ?? '',
    };
  }
}
