import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getData() {
    return this.notificationService.getData();
  }
}
