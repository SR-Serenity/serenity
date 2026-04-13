import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

type CreateOrgBody = {
  name: string;
  slug: string;
};

type SwitchOrgBody = {
  orgSlug: string;
};

@Controller('auth')
export class OrganizationController {
  constructor(private readonly authService: AuthService) {}

  @Get('organizations')
  organizations(@Headers('authorization') authorization?: string) {
    const userId = this.authService.getUserIdFromAuthHeader(authorization);
    return this.authService.listOrganizations(userId);
  }

  @Post('organizations')
  createOrganization(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: CreateOrgBody
  ) {
    const userId = this.authService.getUserIdFromAuthHeader(authorization);
    return this.authService.createOrganization(userId, body);
  }

  @Post('switch-org')
  switchOrganization(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: SwitchOrgBody
  ) {
    const userId = this.authService.getUserIdFromAuthHeader(authorization);
    return this.authService.switchOrganization(userId, body.orgSlug);
  }
}
