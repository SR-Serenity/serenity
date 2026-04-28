import { Controller, Get, Headers, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProxyService } from './api-proxy.service';
import { UserProfileResponseDto, UserResponseDto } from './dto/api-response.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly apiProxy: ApiProxyService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'User profile retrieved', type: UserProfileResponseDto })
  async getProfile(@Headers('authorization') authorization: string) {
    return this.apiProxy.forwardGetRequest('users/profile', authorization);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponse({ description: 'User found', type: UserResponseDto })
  async getUser(
    @Param('id') id: string,
    @Headers('authorization') authorization: string
  ) {
    return this.apiProxy.forwardGetRequest(`users/${id}`, authorization);
  }
}
