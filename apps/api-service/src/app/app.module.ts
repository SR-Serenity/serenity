import { Module } from '@nestjs/common';
import { DatabaseModule } from './modules/database/database.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { ChatModule } from './modules/chat/chat.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [DatabaseModule, UsersModule, OrganizationsModule, ChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
