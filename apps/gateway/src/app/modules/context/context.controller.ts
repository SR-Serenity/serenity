import { Controller, Get, Headers } from '@nestjs/common';
import { AuthProxyService } from '../auth/auth-proxy.service';

@Controller()
export class ContextController {
  constructor(private readonly authProxyService: AuthProxyService) {}

  @Get('context')
  context(@Headers('authorization') authorization: string | undefined) {
    const context = this.authProxyService.getRequestContext(authorization);
    return {
      user_id: context.userId,
      org_id: context.orgId,
    };
  }
}
