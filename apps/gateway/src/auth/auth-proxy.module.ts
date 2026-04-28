import { Module } from '@nestjs/common';
import { AuthProxyController } from './auth-proxy.controller';
import { AuthProxyService } from './auth-proxy.service';

@Module({
  controllers: [AuthProxyController],
  providers: [AuthProxyService],
  exports: [AuthProxyService],
})
export class AuthProxyModule {}
