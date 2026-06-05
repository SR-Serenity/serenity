import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { DepartmentModule } from './department/department.module';
import { InvitationModule } from './invitation/invitation.module';
import { OrganizationModule } from './organization/organization.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    OrganizationModule,
    DepartmentModule,
    InvitationModule,
  ],
})
export class AppModule {}
