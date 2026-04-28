import { Injectable } from '@nestjs/common';

@Injectable()
export class HomeService {
  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}
