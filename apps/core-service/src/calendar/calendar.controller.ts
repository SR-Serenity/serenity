import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.types';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalendarService } from './calendar.service';
import {
  CalendarItemDto,
  CreateCalendarItemDto,
  ListCalendarItemsQueryDto,
  ListCalendarItemsResponseDto,
  UpdateCalendarItemDto,
} from './dto/calendar.dto';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('calendar/items')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiOperation({ summary: 'List calendar items for the current organization' })
  @ApiOkResponse({ type: ListCalendarItemsResponseDto })
  listItems(@CurrentUser() user: AuthUser, @Query() query: ListCalendarItemsQueryDto) {
    return this.calendarService.listItems(user.orgId, user.userId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create calendar item' })
  @ApiBody({ type: CreateCalendarItemDto })
  @ApiCreatedResponse({ type: CalendarItemDto })
  createItem(@CurrentUser() user: AuthUser, @Body() body: CreateCalendarItemDto) {
    return this.calendarService.createItem(user.orgId, user.userId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update calendar item' })
  @ApiBody({ type: UpdateCalendarItemDto })
  @ApiOkResponse({ type: CalendarItemDto })
  updateItem(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateCalendarItemDto,
  ) {
    return this.calendarService.updateItem(user.orgId, user.userId, user.role, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete calendar item' })
  @ApiNoContentResponse({ description: 'Calendar item deleted' })
  deleteItem(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.calendarService.deleteItem(user.orgId, user.userId, user.role, id);
  }
}
