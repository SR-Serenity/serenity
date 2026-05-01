import { Module } from '@nestjs/common';
import { AuthUtilsService } from './auth-utils.service';

@Module({
  providers: [AuthUtilsService],
  exports: [AuthUtilsService],
})
export class SharedModule {}
