import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WikiController } from './wiki.controller';
import { WikiService } from './wiki.service';

@Module({
  imports: [DatabaseModule],
  controllers: [WikiController],
  providers: [WikiService],
})
export class WikiModule {}
