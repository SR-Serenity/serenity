import { Controller, Get, Headers, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiProxyService } from './api-proxy.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly apiProxy: ApiProxyService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization found',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        createdAt: { type: 'string' },
        memberCount: { type: 'number' },
      },
    },
  })
  async getOrganization(
    @Param('id') id: string,
    @Headers('authorization') authorization: string
  ) {
    return this.apiProxy.forwardGetRequest(`organizations/${id}`, authorization);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get organization by slug' })
  @ApiResponse({
    status: 200,
    description: 'Organization found',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        createdAt: { type: 'string' },
        memberCount: { type: 'number' },
      },
    },
  })
  async getOrganizationBySlug(
    @Param('slug') slug: string,
    @Headers('authorization') authorization: string
  ) {
    return this.apiProxy.forwardGetRequest(
      `organizations/slug/${slug}`,
      authorization
    );
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get organization members' })
  @ApiResponse({
    status: 200,
    description: 'Members list retrieved',
    schema: {
      type: 'object',
      properties: {
        members: { type: 'array' },
      },
    },
  })
  async getMembers(
    @Param('id') id: string,
    @Headers('authorization') authorization: string
  ) {
    return this.apiProxy.forwardGetRequest(
      `organizations/${id}/members`,
      authorization
    );
  }
}
