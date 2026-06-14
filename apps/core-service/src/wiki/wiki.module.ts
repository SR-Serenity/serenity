import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WikiController } from './wiki.controller';
import { WikiIndexQueueService } from './wiki-index-queue.service';
import { WikiIndexService } from './wiki-index.service';
import { WikiService } from './wiki.service';

@Module({
  imports: [DatabaseModule],
  controllers: [WikiController],
  providers: [WikiService, WikiIndexService, WikiIndexQueueService],
  exports: [WikiService],
})
export class WikiModule {}
