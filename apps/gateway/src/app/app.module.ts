import { Module } from '@nestjs/common';
import { AuthProxyModule } from './modules/auth/auth-proxy.module';
import { ContextModule } from './modules/context/context.module';

@Module({
  imports: [AuthProxyModule, ContextModule],
})
export class AppModule {}
