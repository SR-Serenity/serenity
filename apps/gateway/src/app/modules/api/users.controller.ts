import { Controller, Get, Headers, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiProxyService } from './api-proxy.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly apiProxy: ApiProxyService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        displayName: { type: 'string' },
        createdAt: { type: 'string' },
        organizations: { type: 'array' },
      },
    },
  })
  async getProfile(@Headers('authorization') authorization: string) {
    return this.apiProxy.forwardGetRequest('users/profile', authorization);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        displayName: { type: 'string' },
        createdAt: { type: 'string' },
      },
    },
  })
  async getUser(
    @Param('id') id: string,
    @Headers('authorization') authorization: string
  ) {
    return this.apiProxy.forwardGetRequest(`users/${id}`, authorization);
  }
}
