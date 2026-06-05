import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { WorkspaceRole } from '@prisma/client';

export type AuthUser = {
  userId: string;
  orgId: string;
  role: WorkspaceRole;
  email: string;
};

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return data ? user?.[data] : user;
  }
);
