import { Body, Controller, Get, NotFoundException, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import {
  OrganizationMembersResponseDto,
  OrganizationResponseDto,
} from './dto/organization-response.dto';
import {
  UpdateMemberDepartmentBodyDto,
  UpdateMemberRoleBodyDto,
} from './dto/update-member.dto';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/auth.types';
import type { AuthUser } from '../auth/auth.types';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiOkResponse({ description: 'Organization found', type: OrganizationResponseDto })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  async getOrganization(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser
  ) {
    const org = await this.organizationsService.getOrganization(id, user.userId);
    return this.ensureOrganizationFound(org);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get organization by slug' })
  @ApiOkResponse({ description: 'Organization found', type: OrganizationResponseDto })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  async getOrganizationBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUser
  ) {
    const org = await this.organizationsService.getOrganizationBySlug(slug, user.userId);
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
    @CurrentUser() user: AuthUser
  ) {
    return this.organizationsService.getOrganizationMembers(id, user.userId);
  }

  @Patch(':id/members/:userId/role')
  @ApiOperation({ summary: 'Update member role (OWNER only)' })
  @ApiBody({ type: UpdateMemberRoleBodyDto })
  @ApiNoContentResponse({ description: 'Role updated successfully' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateMemberRoleBodyDto
  ) {
    return this.organizationsService.updateMemberRole(
      id,
      userId,
      body.role,
      user.userId,
      user.role
    );
  }

  @Patch(':id/members/:userId/department')
  @ApiOperation({ summary: 'Update member department (OWNER only)' })
  @ApiBody({ type: UpdateMemberDepartmentBodyDto })
  @ApiNoContentResponse({ description: 'Department updated successfully' })
  async updateMemberDepartment(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateMemberDepartmentBodyDto
  ) {
    return this.organizationsService.updateMemberDepartment(
      id,
      userId,
      body.departmentId || null,
      user.userId,
      user.role
    );
  }

  private ensureOrganizationFound<T>(organization: T | null): T {
    if (!organization) {
      throw new NotFoundException('Organization not found or access denied');
    }
    return organization;
  }
}
