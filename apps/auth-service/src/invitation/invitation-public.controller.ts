import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AcceptInvitationBodyDto } from './dto/invitation.dto';
import { InvitationService } from './invitation.service';

@ApiTags('invitations')
@Controller('auth')
export class InvitationPublicController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation' })
  @ApiBody({ type: AcceptInvitationBodyDto })
  @ApiOkResponse({ description: 'Invitation accepted successfully' })
  acceptInvitation(@Body() body: AcceptInvitationBodyDto) {
    return this.invitationService.acceptInvitation(body);
  }
}
