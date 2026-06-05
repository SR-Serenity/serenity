import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { GmailClient } from './gmail/gmail.client';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { MailSyncService } from './mail-sync.service';
import { MailTokenService } from './mail-token.service';
import { MailQueueService } from './queue/mail-queue.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MailController],
  providers: [
    GmailClient,
    MailService,
    MailSyncService,
    MailTokenService,
    MailQueueService,
  ],
})
export class MailModule {}
