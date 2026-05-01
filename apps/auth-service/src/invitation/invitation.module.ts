import { Module } from '@nestjs/common';
import { InvitationController } from './invitation.controller';
import { InvitationPublicController } from './invitation-public.controller';
import { InvitationService } from './invitation.service';
import { EmailService } from './email.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [InvitationController, InvitationPublicController],
  providers: [InvitationService, EmailService],
  exports: [InvitationService],
})
export class InvitationModule {}
