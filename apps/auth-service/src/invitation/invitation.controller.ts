import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { AuthUtilsService } from '../shared/auth-utils.service';
import { CreateInvitationRequestDto } from './dto/invitation.dto';
import { InvitationService } from './invitation.service';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

@Controller('auth')
export class InvitationController {
  constructor(
    private readonly authUtils: AuthUtilsService,
    private readonly invitationService: InvitationService
  ) {}

  @Post('invitations')
  createInvitation(
    @Req() req: RequestWithAuth,
    @Body() request: CreateInvitationRequestDto
  ) {
    const authorization = req.headers.authorization as string;
    const userId = this.authUtils.getUserIdFromAuthHeader(authorization);
    const { orgId, role } = this.authUtils.getOrgContextFromHeader(authorization);

    this.authUtils.assertOwnerOrAdmin(role, 'invite members');

    return this.invitationService.createInvitation(orgId, userId, request);
  }

  @Get('invitations')
  listInvitations(@Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    const { orgId, role } = this.authUtils.getOrgContextFromHeader(authorization);
    this.authUtils.assertOwnerOrAdmin(role, 'view invitations');
    return this.invitationService.listInvitations(orgId);
  }

  @Delete('invitations/:id')
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
