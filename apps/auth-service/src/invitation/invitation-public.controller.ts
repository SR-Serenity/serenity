import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AcceptInvitationRequestDto } from './dto/invitation.dto';
import { InvitationService } from './invitation.service';

@Controller('auth')
export class InvitationPublicController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(@Body() request: AcceptInvitationRequestDto) {
    return this.invitationService.acceptInvitation(request);
  }
}
