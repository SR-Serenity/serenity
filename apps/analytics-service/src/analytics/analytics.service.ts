import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}
