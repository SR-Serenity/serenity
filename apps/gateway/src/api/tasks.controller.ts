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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProxyService } from './api-proxy.service';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

enum TaskSourceType {
  MANUAL = 'MANUAL',
  CHAT = 'CHAT',
  WIKI = 'WIKI',
  EMAIL = 'EMAIL',
  CALENDAR = 'CALENDAR',
  DOCUMENT = 'DOCUMENT',
  AI = 'AI',
}

class CreateTaskBodyDto {
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

class UpdateTaskBodyDto {
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

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly apiProxy: ApiProxyService) {}

  @Get()
  @ApiOperation({ summary: 'List workspace tasks' })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'priority', required: false, enum: TaskPriority })
  @ApiQuery({ name: 'sourceType', required: false, enum: TaskSourceType })
  @ApiQuery({ name: 'createdByAi', required: false, type: Boolean })
  @ApiQuery({ name: 'mine', required: false, type: Boolean })
  @ApiQuery({ name: 'dueBefore', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiOkResponse({ description: 'Tasks retrieved' })
  listTasks(@Req() req: RequestWithAuth, @Query() query: Record<string, string>) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardGetRequest('tasks', authorization, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single task' })
  @ApiOkResponse({ description: 'Task retrieved' })
  getTask(@Param('id') id: string, @Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardGetRequest(`tasks/${id}`, authorization);
  }

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  @ApiBody({ type: CreateTaskBodyDto })
  @ApiCreatedResponse({ description: 'Task created' })
  createTask(@Req() req: RequestWithAuth, @Body() body: CreateTaskBodyDto) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPostRequest('tasks', body, authorization);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiBody({ type: UpdateTaskBodyDto })
  @ApiOkResponse({ description: 'Task updated' })
  updateTask(
    @Param('id') id: string,
    @Req() req: RequestWithAuth,
    @Body() body: UpdateTaskBodyDto,
  ) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPatchRequest(`tasks/${id}`, body, authorization);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiNoContentResponse({ description: 'Task deleted' })
  deleteTask(@Param('id') id: string, @Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardDeleteRequest(`tasks/${id}`, authorization);
  }
}
