import { Injectable } from '@nestjs/common';

@Injectable()
export class RealtimeService {
  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}
