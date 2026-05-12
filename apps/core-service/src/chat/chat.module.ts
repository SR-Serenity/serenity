import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { RedisPublisherService } from '../realtime/redis-publisher.service';
import { UploadsModule } from '../uploads/uploads.module';
import { ChatController } from './chat.controller';
import { ChatEventsService } from './chat-events.service';
import { ChatService } from './chat.service';

@Module({
  imports: [DatabaseModule, UploadsModule],
  controllers: [ChatController],
  providers: [ChatService, ChatEventsService, RealtimeEventsService, RedisPublisherService],
})
export class ChatModule {}
