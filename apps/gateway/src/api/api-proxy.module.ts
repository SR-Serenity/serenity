import { Module } from '@nestjs/common';
import { ApiProxyService } from './api-proxy.service';
import { UsersController } from './users.controller';
import { OrganizationsController } from './organizations.controller';

@Module({
  providers: [ApiProxyService],
  controllers: [UsersController, OrganizationsController],
})
export class ApiProxyModule {}
