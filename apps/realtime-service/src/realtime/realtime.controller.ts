import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RealtimeService } from './realtime.service';

@ApiTags('realtime')
@ApiBearerAuth()
@Controller()
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Get()
  getData() {
    return this.realtimeService.getData();
  }
}
