import { Module } from '@nestjs/common';
import { AuthProxyModule } from './auth/auth-proxy.module';
import { ContextModule } from './context/context.module';
import { ApiProxyModule } from './api/api-proxy.module';

@Module({
  imports: [AuthProxyModule, ApiProxyModule, ContextModule],
})
export class AppModule {}
