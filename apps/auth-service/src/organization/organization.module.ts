import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizationController } from './organization.controller';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationController],
})
export class OrganizationModule {}
