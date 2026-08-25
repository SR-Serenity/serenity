import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { InvitationService } from '../invitation/invitation.service';
import {
  LoginRequestDto,
  RegisterRequestDto,
  RegisterWithInvitationRequestDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly invitationService: InvitationService
  ) {}

  @Post('register')
  register(@Body() request: RegisterRequestDto) {
    return this.authService.register(request);
  }

  @Post('register-with-invite')
  registerWithInvitation(@Body() request: RegisterWithInvitationRequestDto) {
    return this.invitationService.registerWithInvitation(request);
  }

  @Post('login')
  login(@Body() request: LoginRequestDto) {
    return this.authService.login(request);
  }
}
