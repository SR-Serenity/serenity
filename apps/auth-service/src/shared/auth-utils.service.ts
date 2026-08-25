import { Injectable, ForbiddenException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import {
  AccessTokenService,
  type AccessTokenPayload,
} from './access-token.service';

@Injectable()
export class AuthUtilsService {
  constructor(private readonly accessTokenService: AccessTokenService) {}

  getUserIdFromAuthHeader(authorization?: string): string {
    return this.payloadFrom(authorization).user_id;
  }

  getOrgContextFromHeader(authorization?: string): {
    orgId: string;
    role: WorkspaceRole;
  } {
    const payload = this.payloadFrom(authorization);
    return { orgId: payload.org_id, role: payload.role };
  }

  assertOwnerOrAdmin(role: WorkspaceRole, action: string): void {
    if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException(`Only OWNER or ADMIN can ${action}`);
    }
  }

  assertOwner(role: WorkspaceRole, action: string): void {
    if (role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException(`Only OWNER can ${action}`);
    }
  }

  private payloadFrom(authorization?: string): AccessTokenPayload {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new ForbiddenException('Missing or invalid authorization header');
    }

    return this.accessTokenService.verify(authorization.substring(7));
  }
}
