import { Controller, Get, Headers, NotFoundException, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  OrganizationMembersResponseDto,
  OrganizationResponseDto,
} from './dto/organization-response.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiOkResponse({ description: 'Organization found', type: OrganizationResponseDto })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  async getOrganization(
    @Param('id') id: string,
    @Headers('authorization') authorization: string
  ) {
    const org = await this.organizationsService.getOrganization(id, authorization);
    return this.ensureOrganizationFound(org);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get organization by slug' })
  @ApiOkResponse({ description: 'Organization found', type: OrganizationResponseDto })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  async getOrganizationBySlug(
    @Param('slug') slug: string,
    @Headers('authorization') authorization: string
  ) {
    const org = await this.organizationsService.getOrganizationBySlug(
      slug,
      authorization
    );
    return this.ensureOrganizationFound(org);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get organization members' })
  @ApiOkResponse({
    description: 'Members list retrieved',
    type: OrganizationMembersResponseDto,
  })
  async getOrganizationMembers(
    @Param('id') id: string,
    @Headers('authorization') authorization: string
  ) {
    return this.organizationsService.getOrganizationMembers(id, authorization);
  }

  private ensureOrganizationFound<T>(organization: T | null): T {
    if (!organization) {
      throw new NotFoundException('Organization not found or access denied');
    }
    return organization;
  }
}
