import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskSourceType, TaskStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class TaskDto {
  @ApiProperty()
    id!: string;

  @ApiProperty()
    title!: string;

  @ApiPropertyOptional()
    description!: string | null;

  @ApiProperty({ enum: TaskStatus, enumName: 'TaskStatus' })
    status!: TaskStatus;

  @ApiProperty({ enum: TaskPriority, enumName: 'TaskPriority' })
    priority!: TaskPriority;

  @ApiPropertyOptional()
    assigneeId!: string | null;

  @ApiPropertyOptional()
    assigneeName!: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
    dueDate!: Date | null;

  @ApiProperty({ enum: TaskSourceType, enumName: 'TaskSourceType' })
    sourceType!: TaskSourceType;

  @ApiPropertyOptional()
    sourceId!: string | null;

  @ApiPropertyOptional()
    sourceTitle!: string | null;

  @ApiProperty()
    createdBy!: string;

  @ApiPropertyOptional()
    createdByName!: string | null;

  @ApiProperty()
    createdByAi!: boolean;

  @ApiPropertyOptional()
    aiReason!: string | null;

  @ApiProperty({ format: 'date-time' })
    createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
    updatedAt!: Date;
}

export class ListTasksResponseDto {
  @ApiProperty({ type: [TaskDto] })
    tasks!: TaskDto[];
}

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
    title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
    description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, enumName: 'TaskStatus' })
  @IsOptional()
  @IsEnum(TaskStatus)
    status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, enumName: 'TaskPriority' })
  @IsOptional()
  @IsEnum(TaskPriority)
    priority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    assigneeId?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
    dueDate?: string;

  @ApiPropertyOptional({ enum: TaskSourceType, enumName: 'TaskSourceType' })
  @IsOptional()
  @IsEnum(TaskSourceType)
    sourceType?: TaskSourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
    sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
    sourceTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
    createdByAi?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
    aiReason?: string;
}

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
    title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
    description?: string | null;

  @ApiPropertyOptional({ enum: TaskStatus, enumName: 'TaskStatus' })
  @IsOptional()
  @IsEnum(TaskStatus)
    status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, enumName: 'TaskPriority' })
  @IsOptional()
  @IsEnum(TaskPriority)
    priority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    assigneeId?: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
    dueDate?: string | null;
}
