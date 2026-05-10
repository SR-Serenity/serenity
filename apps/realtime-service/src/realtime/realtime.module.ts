import { Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RedisSubscriberService } from './redis-subscriber.service';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [],
  controllers: [RealtimeController],
  providers: [RealtimeService, RedisSubscriberService],
})
export class RealtimeModule {}
