import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InvitationModule } from '../invitation/invitation.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule, InvitationModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
