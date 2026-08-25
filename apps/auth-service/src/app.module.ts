import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { DepartmentModule } from './department/department.module';
import { InvitationModule } from './invitation/invitation.module';
import { OrganizationModule } from './organization/organization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['apps/auth-service/.env', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    OrganizationModule,
    DepartmentModule,
    InvitationModule,
  ],
})
export class AppModule {}
