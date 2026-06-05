import { Module } from '@nestjs/common';
import { AuthProxyController } from './auth-proxy.controller';
import { AuthProxyProtectedController } from './auth-proxy-protected.controller';
import { AuthProxyService } from './auth-proxy.service';

@Module({
  controllers: [AuthProxyController, AuthProxyProtectedController],
  providers: [AuthProxyService],
  exports: [AuthProxyService],
})
export class AuthProxyModule {}
