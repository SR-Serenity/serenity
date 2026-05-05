import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserProfileResponseDto, UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/auth.types';
import type { AuthUser } from '../auth/auth.types';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    type: UserProfileResponseDto,
  })
  async getProfile(@CurrentUser() user: AuthUser) {
    return this.usersService.getUserProfile(user.userId);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponse({ description: 'User found', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.getUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
