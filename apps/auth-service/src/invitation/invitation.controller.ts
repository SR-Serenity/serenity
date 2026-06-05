import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthUtilsService } from '../shared/auth-utils.service';
import {
  CreateInvitationBodyDto,
  ListInvitationsResponseDto,
} from './dto/invitation.dto';
import { InvitationService } from './invitation.service';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('auth')
export class InvitationController {
  constructor(
    private readonly authUtils: AuthUtilsService,
    private readonly invitationService: InvitationService
  ) {}

  @Post('invitations')
  @ApiOperation({ summary: 'Invite a new member (OWNER: ADMIN/MEMBER, ADMIN: MEMBER only)' })
  @ApiBody({ type: CreateInvitationBodyDto })
  @ApiCreatedResponse({ description: 'Invitation sent successfully' })
  createInvitation(
    @Req() req: RequestWithAuth,
    @Body() body: CreateInvitationBodyDto
  ) {
    const authorization = req.headers.authorization as string;
    const userId = this.authUtils.getUserIdFromAuthHeader(authorization);
    const { orgId, role } = this.authUtils.getOrgContextFromHeader(authorization);

    this.authUtils.assertOwnerOrAdmin(role, 'invite members');

    return this.invitationService.createInvitation(orgId, userId, body);
  }

  @Get('invitations')
  @ApiOperation({ summary: 'List pending invitations (OWNER, ADMIN)' })
  @ApiOkResponse({
    description: 'List of pending invitations',
    type: ListInvitationsResponseDto,
  })
  listInvitations(@Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    const { orgId, role } = this.authUtils.getOrgContextFromHeader(authorization);
    this.authUtils.assertOwnerOrAdmin(role, 'view invitations');
    return this.invitationService.listInvitations(orgId);
  }

  @Delete('invitations/:id')
  @ApiOperation({ summary: 'Revoke an invitation (OWNER, ADMIN)' })
  @ApiNoContentResponse({ description: 'Invitation revoked successfully' })
  revokeInvitation(
    @Req() req: RequestWithAuth,
    @Param('id') id: string
  ) {
    const authorization = req.headers.authorization as string;
    const { orgId, role } = this.authUtils.getOrgContextFromHeader(authorization);
    this.authUtils.assertOwnerOrAdmin(role, 'revoke invitations');
    return this.invitationService.revokeInvitation(orgId, id);
  }
}
