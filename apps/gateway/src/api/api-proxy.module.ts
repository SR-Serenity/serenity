import { Module } from '@nestjs/common';
import { ApiProxyService } from './api-proxy.service';
import { UsersController } from './users.controller';
import { OrganizationsController } from './organizations.controller';
import { ChatController } from './chat.controller';
import { ContactsController } from './contacts.controller';
import { CalendarController } from './calendar.controller';
import { WikiController } from './wiki.controller';

@Module({
  providers: [ApiProxyService],
  controllers: [
    UsersController,
    OrganizationsController,
    ChatController,
    ContactsController,
    CalendarController,
    WikiController,
  ],
})
export class ApiProxyModule {}
