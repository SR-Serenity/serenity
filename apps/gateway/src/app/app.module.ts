import { Module } from '@nestjs/common';
import { AuthProxyModule } from './modules/auth/auth-proxy.module';
import { ContextModule } from './modules/context/context.module';
import { ApiProxyModule } from './modules/api/api-proxy.module';

@Module({
  imports: [AuthProxyModule, ApiProxyModule, ContextModule],
})
export class AppModule {}
