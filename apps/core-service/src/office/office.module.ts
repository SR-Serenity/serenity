import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { RedisPublisherService } from '../realtime/redis-publisher.service';
import { OfficeController } from './office.controller';
import { OfficeEventsService } from './office-events.service';
import { OfficeService } from './office.service';

@Module({
  imports: [DatabaseModule],
  controllers: [OfficeController],
  providers: [OfficeService, OfficeEventsService, RealtimeEventsService, RedisPublisherService],
})
export class OfficeModule {}
