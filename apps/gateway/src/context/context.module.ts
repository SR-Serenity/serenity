import { Module } from '@nestjs/common';
import { AuthProxyModule } from '../auth/auth-proxy.module';
import { ContextController } from './context.controller';

@Module({
  imports: [AuthProxyModule],
  controllers: [ContextController],
})
export class ContextModule {}
