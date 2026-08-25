import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type User, WorkspaceRole } from '@prisma/client';
import { JwtPayload, type SignOptions, sign, verify } from 'jsonwebtoken';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  user_id: string;
  org_id: string;
  role: WorkspaceRole;
  email: string;
  displayName: string;
}

@Injectable()
export class AccessTokenService {
  private readonly secret: string;
  private readonly expiresIn: SignOptions['expiresIn'];

  constructor(configService: ConfigService) {
    this.secret = configService.getOrThrow<string>('JWT_SECRET');
    this.expiresIn = configService.get(
      'JWT_EXPIRES_IN',
      '1d'
    ) as SignOptions['expiresIn'];
  }

  sign(user: User, organizationId: string, role: WorkspaceRole): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      user_id: user.id,
      org_id: organizationId,
      role,
      email: user.email,
      displayName: user.displayName,
    };

    return sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  verify(token: string): AccessTokenPayload {
    try {
      const payload = verify(token, this.secret);
      if (
        typeof payload === 'string' ||
        typeof payload.sub !== 'string' ||
        typeof payload.user_id !== 'string' ||
        typeof payload.org_id !== 'string' ||
        !Object.values(WorkspaceRole).includes(payload.role as WorkspaceRole) ||
        typeof payload.email !== 'string' ||
        typeof payload.displayName !== 'string'
      ) {
        throw new Error('Invalid access token payload');
      }

      return payload as AccessTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
