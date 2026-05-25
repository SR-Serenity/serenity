import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CalendarItemType, CalendarTaskStatus, CalendarVisibility } from '@prisma/client';
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

export class CalendarAttendeeDto {
  @ApiProperty()
    userId!: string;

  @ApiProperty()
    displayName!: string;

  @ApiProperty()
    email!: string;
}

export class CalendarItemDto {
  @ApiProperty()
    id!: string;

  @ApiProperty({ enum: CalendarItemType, enumName: 'CalendarItemType' })
    type!: CalendarItemType;

  @ApiProperty({ enum: CalendarVisibility, enumName: 'CalendarVisibility' })
    visibility!: CalendarVisibility;

  @ApiProperty()
    title!: string;

  @ApiPropertyOptional()
    descriptionMarkdown!: string | null;

  @ApiPropertyOptional()
    location!: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
    startAt!: Date | null;

  @ApiPropertyOptional({ format: 'date-time' })
    endAt!: Date | null;

  @ApiProperty()
    allDay!: boolean;

  @ApiPropertyOptional({ enum: CalendarTaskStatus, enumName: 'CalendarTaskStatus' })
    taskStatus!: CalendarTaskStatus | null;

  @ApiPropertyOptional({ format: 'date-time' })
    dueDate!: Date | null;

  @ApiProperty()
    createdById!: string;

  @ApiProperty({ type: [CalendarAttendeeDto] })
    attendees!: CalendarAttendeeDto[];

  @ApiProperty({ format: 'date-time' })
    createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
    updatedAt!: Date;
}

export class ListCalendarItemsResponseDto {
  @ApiProperty({ type: [CalendarItemDto] })
    items!: CalendarItemDto[];
}

export class ListCalendarItemsQueryDto {
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

export class CreateCalendarItemDto {
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

export class UpdateCalendarItemDto {
  @ApiPropertyOptional({ enum: CalendarItemType, enumName: 'CalendarItemType' })
  @IsOptional()
  @IsEnum(CalendarItemType)
    type?: CalendarItemType;

  @ApiPropertyOptional({ enum: CalendarVisibility, enumName: 'CalendarVisibility' })
  @IsOptional()
  @IsEnum(CalendarVisibility)
    visibility?: CalendarVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
    title?: string;

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
