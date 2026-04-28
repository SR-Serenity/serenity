import { Controller, Get, Headers, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProxyService } from './api-proxy.service';
import {
  OrganizationMembersResponseDto,
  OrganizationResponseDto,
} from './dto/api-response.dto';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly apiProxy: ApiProxyService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiOkResponse({ description: 'Organization found', type: OrganizationResponseDto })
  async getOrganization(
    @Param('id') id: string,
    @Headers('authorization') authorization: string
  ) {
    return this.apiProxy.forwardGetRequest(`organizations/${id}`, authorization);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get organization by slug' })
  @ApiOkResponse({ description: 'Organization found', type: OrganizationResponseDto })
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
  @ApiOkResponse({
    description: 'Members list retrieved',
    type: OrganizationMembersResponseDto,
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
