import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { HomeModule } from './home/home.module';

@Module({
  imports: [DatabaseModule, UsersModule, OrganizationsModule, HomeModule],
})
export class AppModule {}
