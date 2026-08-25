import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AuthUtilsService } from '../shared/auth-utils.service';
import {
  CreateOrganizationRequestDto,
  SwitchOrganizationRequestDto,
} from './dto/organization.dto';
import { OrganizationService } from './organization.service';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

@Controller('auth')
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly authUtils: AuthUtilsService
  ) {}

  @Get('organizations')
  organizations(@Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string | undefined;
    const userId = this.authUtils.getUserIdFromAuthHeader(authorization);
    return this.organizationService.listOrganizations(userId);
  }

  @Post('organizations')
  createOrganization(
    @Req() req: RequestWithAuth,
    @Body() request: CreateOrganizationRequestDto
  ) {
    const authorization = req.headers.authorization as string | undefined;
    const userId = this.authUtils.getUserIdFromAuthHeader(authorization);
    return this.organizationService.createOrganization(userId, request);
  }

  @Post('switch-org')
  switchOrganization(
    @Req() req: RequestWithAuth,
    @Body() request: SwitchOrganizationRequestDto
  ) {
    const authorization = req.headers.authorization as string | undefined;
    const userId = this.authUtils.getUserIdFromAuthHeader(authorization);
    return this.organizationService.switchOrganization(userId, request);
  }
}
