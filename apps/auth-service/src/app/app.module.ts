import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './modules/database/database.module';
import { OrganizationModule } from './modules/organization/organization.module';

@Module({
  imports: [DatabaseModule, AuthModule, OrganizationModule],
})
export class AppModule {}
