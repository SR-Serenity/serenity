import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AccessTokenService,
  type AccessTokenPayload,
} from './access-token.service';

export interface AuthenticatedRequest {
  headers: {
    authorization?: string;
  };
  user: AccessTokenPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly accessTokenService: AccessTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    request.user = this.accessTokenService.verify(token);
    return true;
  }
}
