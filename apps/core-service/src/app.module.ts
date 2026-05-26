import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { ContactsModule } from './contacts/contacts.module';
import { CalendarModule } from './calendar/calendar.module';
import { WikiModule } from './wiki/wiki.module';
import { MailModule } from './mail/mail.module';
import { OfficeModule } from './office/office.module';

@Module({
  imports: [AuthModule, DatabaseModule, UsersModule, OrganizationsModule, ChatModule, ContactsModule, CalendarModule, WikiModule, MailModule, OfficeModule],
})
export class AppModule {}
