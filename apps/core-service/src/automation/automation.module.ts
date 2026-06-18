import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { RedisPublisherService } from '../realtime/redis-publisher.service';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutomationEngineService } from './automation-engine.service';
import { AutomationAgentService } from './automation-agent.service';
import { AutomationSchedulerService } from './automation-scheduler.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AutomationController],
  providers: [
    AutomationService,
    AutomationEngineService,
    AutomationAgentService,
    AutomationSchedulerService,
    RealtimeEventsService,
    RedisPublisherService,
  ],
  exports: [AutomationEngineService],
})
export class AutomationModule {}
