import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatGateway } from './chat.gateway';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, ChatGateway, PrismaService, RedisService],
})
export class AppModule {}
