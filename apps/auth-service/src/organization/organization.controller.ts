import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { AuthResponseDto } from '../auth/dto/auth.dto';
import {
  CreateOrganizationBodyDto,
  SwitchOrganizationBodyDto,
  UserOrganizationsResponseDto,
} from './dto/organization.dto';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('auth')
export class OrganizationController {
  constructor(private readonly authService: AuthService) {}

  @Get('organizations')
  @ApiOperation({ summary: 'List user organizations' })
  @ApiOkResponse({
    description: 'List of organizations',
    type: UserOrganizationsResponseDto,
  })
  organizations(@Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string | undefined;
    const userId = this.authService.getUserIdFromAuthHeader(authorization);
    return this.authService.listOrganizations(userId);
  }

  @Post('organizations')
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiBody({ type: CreateOrganizationBodyDto })
  @ApiCreatedResponse({
    description: 'Organization created successfully',
    type: AuthResponseDto,
  })
  createOrganization(
    @Req() req: RequestWithAuth,
    @Body() body: CreateOrganizationBodyDto
  ) {
    const authorization = req.headers.authorization as string | undefined;
    const userId = this.authService.getUserIdFromAuthHeader(authorization);
    return this.authService.createOrganization(userId, body);
  }

  @Post('switch-org')
  @ApiOperation({ summary: 'Switch to a different organization' })
  @ApiBody({ type: SwitchOrganizationBodyDto })
  @ApiOkResponse({
    description: 'Organization switched successfully',
    type: AuthResponseDto,
  })
  switchOrganization(
    @Req() req: RequestWithAuth,
    @Body() body: SwitchOrganizationBodyDto
  ) {
    const authorization = req.headers.authorization as string | undefined;
    const userId = this.authService.getUserIdFromAuthHeader(authorization);
    return this.authService.switchOrganization(userId, body.orgSlug);
  }
}
