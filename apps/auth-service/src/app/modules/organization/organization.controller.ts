import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';

type CreateOrgBody = {
  name: string;
  slug: string;
};

type SwitchOrgBody = {
  orgSlug: string;
};

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('auth')
export class OrganizationController {
  constructor(private readonly authService: AuthService) {}

  @Get('organizations')
  @ApiOperation({ summary: 'List user organizations' })
  @ApiResponse({
    status: 200,
    description: 'List of organizations',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          createdAt: { type: 'string' },
        },
      },
    },
  })
  organizations(@Headers('authorization') authorization?: string) {
    const userId = this.authService.getUserIdFromAuthHeader(authorization);
    return this.authService.listOrganizations(userId);
  }

  @Post('organizations')
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'My New Org' },
        slug: { type: 'string', example: 'my-new-org' },
      },
      required: ['name', 'slug'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        createdAt: { type: 'string' },
      },
    },
  })
  createOrganization(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: CreateOrgBody
  ) {
    const userId = this.authService.getUserIdFromAuthHeader(authorization);
    return this.authService.createOrganization(userId, body);
  }

  @Post('switch-org')
  @ApiOperation({ summary: 'Switch to a different organization' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        orgSlug: { type: 'string', example: 'my-org' },
      },
      required: ['orgSlug'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Organization switched successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
      },
    },
  })
  switchOrganization(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: SwitchOrgBody
  ) {
    const userId = this.authService.getUserIdFromAuthHeader(authorization);
    return this.authService.switchOrganization(userId, body.orgSlug);
  }
}
