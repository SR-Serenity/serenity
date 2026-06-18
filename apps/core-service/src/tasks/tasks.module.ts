import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AutomationModule } from '../automation/automation.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [DatabaseModule, AutomationModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
