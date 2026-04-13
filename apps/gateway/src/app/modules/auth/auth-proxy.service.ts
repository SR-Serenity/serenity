import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import { JwtPayload, verify } from 'jsonwebtoken';

type AuthContext = {
  userId: string;
  orgId: string;
};

@Injectable()
export class AuthProxyService {
  async forwardAuthRequest(
    endpoint: string,
    body: unknown,
    authHeader?: string
  ) {
    const response = await axios.post(
      `${this.authServiceUrl()}/auth/${endpoint}`,
      body,
      {
        headers: this.forwardHeaders(authHeader),
      }
    );
    return response.data;
  }

  async forwardAuthGet(endpoint: string, authHeader?: string) {
    const response = await axios.get(`${this.authServiceUrl()}/auth/${endpoint}`, {
      headers: this.forwardHeaders(authHeader),
    });
    return response.data;
  }

  getRequestContext(authHeader?: string) {
    return this.requireAuthContext(authHeader);
  }

  private requireAuthContext(authHeader?: string): AuthContext {
    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    const payload = verify(token, this.jwtSecret());
    if (!payload || typeof payload === 'string') {
      throw new UnauthorizedException('Invalid token payload');
    }

    const decoded = payload as JwtPayload;
    const userId = decoded.user_id ?? decoded.sub;
    const orgId = decoded.org_id;
    if (typeof userId !== 'string' || typeof orgId !== 'string') {
      throw new UnauthorizedException('Token missing user_id or org_id');
    }

    return { userId, orgId };
  }

  private forwardHeaders(authHeader?: string) {
    if (!authHeader) {
      return {};
    }
    const context = this.requireAuthContext(authHeader);
    return {
      authorization: authHeader,
      'x-user-id': context.userId,
      'x-org-id': context.orgId,
    };
  }

  private authServiceUrl() {
    return process.env.AUTH_SERVICE_URL ?? 'http://localhost:2992/api';
  }

  private jwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('JWT_SECRET is not configured');
    }
    return secret;
  }
}
