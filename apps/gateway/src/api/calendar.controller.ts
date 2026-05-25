import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProxyService } from './api-proxy.service';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

enum CalendarItemType {
  EVENT = 'EVENT',
  MEETING = 'MEETING',
  TASK = 'TASK',
}

enum CalendarVisibility {
  COMPANY = 'COMPANY',
  PERSONAL = 'PERSONAL',
}

enum CalendarTaskStatus {
  TODO = 'TODO',
  DONE = 'DONE',
}

class ListCalendarItemsQueryDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
    from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
    to?: string;

  @ApiPropertyOptional({ enum: CalendarVisibility, enumName: 'CalendarVisibility' })
  @IsOptional()
  @IsEnum(CalendarVisibility)
    visibility?: CalendarVisibility;

  @ApiPropertyOptional({ enum: CalendarItemType, enumName: 'CalendarItemType' })
  @IsOptional()
  @IsEnum(CalendarItemType)
    type?: CalendarItemType;
}

class CreateCalendarItemBodyDto {
  @ApiProperty({ enum: CalendarItemType, enumName: 'CalendarItemType' })
  @IsEnum(CalendarItemType)
    type!: CalendarItemType;

  @ApiProperty({ enum: CalendarVisibility, enumName: 'CalendarVisibility' })
  @IsEnum(CalendarVisibility)
    visibility!: CalendarVisibility;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
    title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
    descriptionMarkdown?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
    location?: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
    startAt?: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
    endAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
    allDay?: boolean;

  @ApiPropertyOptional({ enum: CalendarTaskStatus, enumName: 'CalendarTaskStatus' })
  @IsOptional()
  @IsEnum(CalendarTaskStatus)
    taskStatus?: CalendarTaskStatus | null;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
    dueDate?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
    attendeeIds?: string[];
}

class UpdateCalendarItemBodyDto extends CreateCalendarItemBodyDto {
  @ApiPropertyOptional({ enum: CalendarItemType, enumName: 'CalendarItemType' })
  @IsOptional()
  @IsEnum(CalendarItemType)
    override type?: CalendarItemType;

  @ApiPropertyOptional({ enum: CalendarVisibility, enumName: 'CalendarVisibility' })
  @IsOptional()
  @IsEnum(CalendarVisibility)
    override visibility?: CalendarVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
    override title?: string;
}

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('calendar/items')
export class CalendarController {
  constructor(private readonly apiProxy: ApiProxyService) {}

  @Get()
  @ApiOperation({ summary: 'List calendar items' })
  @ApiOkResponse({ description: 'Calendar items retrieved' })
  listItems(@Req() req: RequestWithAuth, @Query() query: ListCalendarItemsQueryDto) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardGetRequest('calendar/items', authorization, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create calendar item' })
  @ApiBody({ type: CreateCalendarItemBodyDto })
  @ApiCreatedResponse({ description: 'Calendar item created' })
  createItem(@Req() req: RequestWithAuth, @Body() body: CreateCalendarItemBodyDto) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPostRequest('calendar/items', body, authorization);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update calendar item' })
  @ApiBody({ type: UpdateCalendarItemBodyDto })
  @ApiOkResponse({ description: 'Calendar item updated' })
  updateItem(
    @Param('id') id: string,
    @Req() req: RequestWithAuth,
    @Body() body: UpdateCalendarItemBodyDto,
  ) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPatchRequest(`calendar/items/${id}`, body, authorization);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete calendar item' })
  @ApiNoContentResponse({ description: 'Calendar item deleted' })
  deleteItem(@Param('id') id: string, @Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardDeleteRequest(`calendar/items/${id}`, authorization);
  }
}
