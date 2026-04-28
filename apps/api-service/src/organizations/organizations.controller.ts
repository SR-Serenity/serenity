import { Controller, Get, Headers, NotFoundException, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

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
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganization(
    @Param('id') id: string,
    @Headers('authorization') authorization: string
  ) {
    const org = await this.organizationsService.getOrganization(id, authorization);
    if (!org) {
      throw new NotFoundException('Organization not found or access denied');
    }
    return org;
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
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationBySlug(
    @Param('slug') slug: string,
    @Headers('authorization') authorization: string
  ) {
    const org = await this.organizationsService.getOrganizationBySlug(
      slug,
      authorization
    );
    if (!org) {
      throw new NotFoundException('Organization not found or access denied');
    }
    return org;
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get organization members' })
  @ApiResponse({
    status: 200,
    description: 'Members list retrieved',
    schema: {
      type: 'object',
      properties: {
        members: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              displayName: { type: 'string' },
              role: { type: 'string' },
              joinedAt: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getOrganizationMembers(
    @Param('id') id: string,
    @Headers('authorization') authorization: string
  ) {
    return this.organizationsService.getOrganizationMembers(id, authorization);
  }
}
