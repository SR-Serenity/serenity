import { Controller, Get, Headers, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        displayName: { type: 'string' },
        createdAt: { type: 'string' },
        organizations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              role: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getProfile(@Headers('authorization') authorization: string) {
    return this.usersService.getUserProfile(authorization);
  }

  @Get('/:id')
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
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(id: string) {
    const user = await this.usersService.getUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
