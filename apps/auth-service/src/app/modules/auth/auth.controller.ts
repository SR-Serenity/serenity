import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

type RegisterBody = {
  email: string;
  password: string;
  displayName: string;
  orgName: string;
  orgSlug: string;
};

type LoginBody = {
  email: string;
  password: string;
  orgSlug?: string;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterBody) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: LoginBody) {
    return this.authService.login(body);
  }
}
