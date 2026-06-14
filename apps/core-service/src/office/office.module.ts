import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { RedisPublisherService } from '../realtime/redis-publisher.service';
import { WikiModule } from '../wiki/wiki.module';
import { OfficeController } from './office.controller';
import { OfficeEventsService } from './office-events.service';
import { OfficeInternalController } from './office-internal.controller';
import { OfficeService } from './office.service';

@Module({
  imports: [DatabaseModule, WikiModule],
  controllers: [OfficeController, OfficeInternalController],
  providers: [OfficeService, OfficeEventsService, RealtimeEventsService, RedisPublisherService],
})
export class OfficeModule {}
