import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { InvitationService } from '../invitation/invitation.service';
import { AuthResponseDto, LoginBodyDto, RegisterBodyDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly invitationService: InvitationService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterBodyDto })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  register(@Body() body: RegisterBodyDto) {
    return this.authService.register(body);
  }

  @Post('register-with-invite')
  @ApiOperation({ summary: 'Register a new user with invitation' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
        displayName: { type: 'string' },
        inviteToken: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({ description: 'User registered and invitation accepted' })
  async registerWithInvite(
    @Body()
      body: {
      email: string;
      password: string;
      displayName: string;
      inviteToken: string;
    },
  ) {
    // Then accept the invitation
    return this.invitationService.acceptInvitation({
      token: body.inviteToken,
    });
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginBodyDto })
  @ApiOkResponse({ description: 'Login successful', type: AuthResponseDto })
  login(@Body() body: LoginBodyDto) {
    return this.authService.login(body);
  }
}
