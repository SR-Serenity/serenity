import { Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [],
  controllers: [RealtimeController],
  providers: [RealtimeService],
})
export class RealtimeModule {}
