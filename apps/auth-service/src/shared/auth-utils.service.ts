import { Injectable, ForbiddenException } from '@nestjs/common';

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER';

@Injectable()
export class AuthUtilsService {
  getUserIdFromAuthHeader(authorization: string): string {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new ForbiddenException('Missing or invalid authorization header');
    }

    const token = authorization.substring(7);
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new ForbiddenException('Invalid token format');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const userId = payload.user_id || payload.sub;

      if (!userId) {
        throw new ForbiddenException('User ID not found in token');
      }

      return userId;
    } catch (err) {
      throw new ForbiddenException('Invalid token');
    }
  }

  getOrgContextFromHeader(authorization: string): { orgId: string; role: UserRole } {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new ForbiddenException('Missing or invalid authorization header');
    }

    const token = authorization.substring(7);
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new ForbiddenException('Invalid token format');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const orgId = payload.org_id;
      const role = payload.role;

      if (!orgId || !role) {
        throw new ForbiddenException('Organization context not found in token');
      }

      return { orgId, role };
    } catch (err) {
      throw new ForbiddenException('Cannot extract org context from token');
    }
  }

  assertOwnerOrAdmin(role: string, action: string): void {
    if (role !== 'OWNER' && role !== 'ADMIN') {
      throw new ForbiddenException(`Only OWNER or ADMIN can ${action}`);
    }
  }
}
