import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MailTokenService } from '../mail/mail-token.service';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { GoogleCalendarClient } from './google-calendar.client';

@Module({
  imports: [DatabaseModule],
  controllers: [CalendarController],
  providers: [CalendarService, GoogleCalendarClient, MailTokenService],
})
export class CalendarModule {}
