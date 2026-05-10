import { Controller, Query, Req, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RealtimeService } from './realtime.service';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

@ApiTags('realtime')
@ApiBearerAuth()
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Sse('events')
  streamEvents(@Query('token') token: string | undefined, @Req() req: RequestWithAuth) {
    const authHeader = req.headers.authorization;
    const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;
    const user = this.realtimeService.verifyToken(token ?? bearerToken);
    return this.realtimeService.streamEvents(user);
  }
}
