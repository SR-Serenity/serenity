import { Module } from '@nestjs/common';
import { AuthUtilsService } from './auth-utils.service';
import { AccessTokenService } from './access-token.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  providers: [AuthUtilsService, AccessTokenService, JwtAuthGuard],
  exports: [AuthUtilsService, AccessTokenService, JwtAuthGuard],
})
export class SharedModule {}
