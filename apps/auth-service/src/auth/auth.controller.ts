import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
        displayName: { type: 'string', example: 'John Doe' },
        orgName: { type: 'string', example: 'My Organization' },
        orgSlug: { type: 'string', example: 'my-org' },
      },
      required: ['email', 'password', 'displayName', 'orgName', 'orgSlug'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        displayName: { type: 'string' },
        access_token: { type: 'string' },
      },
    },
  })
  register(@Body() body: RegisterBody) {
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
        orgSlug: { type: 'string', example: 'my-org' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            displayName: { type: 'string' },
          },
        },
      },
    },
  })
  login(@Body() body: LoginBody) {
    return this.authService.login(body);
  }
}
