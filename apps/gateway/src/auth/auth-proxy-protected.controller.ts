import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthProxyService } from './auth-proxy.service';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthProxyProtectedController {
  constructor(private readonly authProxyService: AuthProxyService) {}

  @Get('organizations')
  organizations(@Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string | undefined;
    return this.authProxyService.forwardAuthGet('organizations', authorization);
  }

  @Post('organizations')
  createOrganization(
    @Req() req: RequestWithAuth,
    @Body() body: unknown
  ) {
    const authorization = req.headers.authorization as string | undefined;
    return this.authProxyService.forwardAuthRequest(
      'organizations',
      body,
      authorization
    );
  }

  @Post('switch-org')
  switchOrg(
    @Req() req: RequestWithAuth,
    @Body() body: unknown
  ) {
    const authorization = req.headers.authorization as string | undefined;
    return this.authProxyService.forwardAuthRequest(
      'switch-org',
      body,
      authorization
    );
  }

  @Get('departments')
  listDepartments(@Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string | undefined;
    return this.authProxyService.forwardAuthGet('departments', authorization);
  }

  @Post('departments')
  createDepartment(
    @Req() req: RequestWithAuth,
    @Body() body: unknown
  ) {
    const authorization = req.headers.authorization as string | undefined;
    return this.authProxyService.forwardAuthRequest('departments', body, authorization);
  }

  @Patch('departments/:id')
  updateDepartment(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const authorization = req.headers.authorization as string | undefined;
    return this.authProxyService.forwardAuthRequest(`departments/${id}`, body, authorization);
  }

  @Delete('departments/:id')
  deleteDepartment(
    @Req() req: RequestWithAuth,
    @Param('id') id: string
  ) {
    const authorization = req.headers.authorization as string | undefined;
    return this.authProxyService.forwardAuthRequest(`departments/${id}`, {}, authorization, 'DELETE');
  }

  @Get('invitations')
  listInvitations(@Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string | undefined;
    return this.authProxyService.forwardAuthGet('invitations', authorization);
  }

  @Post('invitations')
  createInvitation(
    @Req() req: RequestWithAuth,
    @Body() body: unknown
  ) {
    const authorization = req.headers.authorization as string | undefined;
    return this.authProxyService.forwardAuthRequest('invitations', body, authorization);
  }

  @Delete('invitations/:id')
  revokeInvitation(
    @Req() req: RequestWithAuth,
    @Param('id') id: string
  ) {
    const authorization = req.headers.authorization as string | undefined;
    return this.authProxyService.forwardAuthRequest(`invitations/${id}`, {}, authorization, 'DELETE');
  }
}
