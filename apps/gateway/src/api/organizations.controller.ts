import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiNoContentResponse,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProxyService } from './api-proxy.service';
import {
  OrganizationMembersResponseDto,
  OrganizationResponseDto,
} from './dto/api-response.dto';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

enum WorkspaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

class UpdateMemberRoleBodyDto {
  @ApiProperty({ enum: WorkspaceRole, enumName: 'WorkspaceRole' })
  @IsEnum(WorkspaceRole)
    role!: WorkspaceRole;
}

class UpdateMemberDepartmentBodyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    departmentId?: string;
}

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
    @Req() req: RequestWithAuth
  ) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardGetRequest(`organizations/${id}`, authorization);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get organization by slug' })
  @ApiOkResponse({ description: 'Organization found', type: OrganizationResponseDto })
  async getOrganizationBySlug(
    @Param('slug') slug: string,
    @Req() req: RequestWithAuth
  ) {
    const authorization = req.headers.authorization as string;
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
    @Req() req: RequestWithAuth
  ) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardGetRequest(
      `organizations/${id}/members`,
      authorization
    );
  }

  @Patch(':id/members/:userId/role')
  @ApiOperation({ summary: 'Update member role (OWNER only)' })
  @ApiBody({ type: UpdateMemberRoleBodyDto })
  @ApiNoContentResponse({ description: 'Role updated successfully' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: RequestWithAuth,
    @Body() body: UpdateMemberRoleBodyDto
  ) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPatchRequest(
      `organizations/${id}/members/${userId}/role`,
      body,
      authorization,
    );
  }

  @Patch(':id/members/:userId/department')
  @ApiOperation({ summary: 'Update member department (OWNER only)' })
  @ApiBody({ type: UpdateMemberDepartmentBodyDto })
  @ApiNoContentResponse({ description: 'Department updated successfully' })
  async updateMemberDepartment(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: RequestWithAuth,
    @Body() body: UpdateMemberDepartmentBodyDto
  ) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPatchRequest(
      `organizations/${id}/members/${userId}/department`,
      body,
      authorization,
    );
  }
}
