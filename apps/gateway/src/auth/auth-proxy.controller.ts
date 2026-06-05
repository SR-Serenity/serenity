import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthProxyService } from './auth-proxy.service';

@ApiTags('auth')
@Controller('auth')
export class AuthProxyController {
  constructor(private readonly authProxyService: AuthProxyService) {}

  @Post('register')
  register(@Body() body: unknown) {
    return this.authProxyService.forwardAuthRequest('register', body);
  }

  @Post('register-with-invite')
  registerWithInvite(@Body() body: unknown) {
    return this.authProxyService.forwardAuthRequest('register-with-invite', body);
  }

  @Post('login')
  login(@Body() body: unknown) {
    return this.authProxyService.forwardAuthRequest('login', body);
  }

  @Post('invitations/accept')
  acceptInvitation(@Body() body: unknown) {
    return this.authProxyService.forwardAuthRequest('invitations/accept', body);
  }
}
