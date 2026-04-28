import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthProxyService } from './auth-proxy.service';

@Controller('auth')
export class AuthProxyController {
  constructor(private readonly authProxyService: AuthProxyService) {}

  @Post('register')
  register(@Body() body: unknown) {
    return this.authProxyService.forwardAuthRequest('register', body);
  }

  @Post('login')
  login(@Body() body: unknown) {
    return this.authProxyService.forwardAuthRequest('login', body);
  }

  @Get('organizations')
  organizations(@Headers('authorization') authorization: string | undefined) {
    return this.authProxyService.forwardAuthGet('organizations', authorization);
  }

  @Post('organizations')
  createOrganization(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown
  ) {
    return this.authProxyService.forwardAuthRequest(
      'organizations',
      body,
      authorization
    );
  }

  @Post('switch-org')
  switchOrg(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown
  ) {
    return this.authProxyService.forwardAuthRequest(
      'switch-org',
      body,
      authorization
    );
  }
}
