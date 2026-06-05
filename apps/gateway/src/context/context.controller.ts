import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthProxyService } from '../auth/auth-proxy.service';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

@ApiBearerAuth()
@Controller()
export class ContextController {
  constructor(private readonly authProxyService: AuthProxyService) {}

  @Get('context')
  context(@Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string | undefined;
    const context = this.authProxyService.getRequestContext(authorization);
    return {
      user_id: context.userId,
      org_id: context.orgId,
    };
  }
}
