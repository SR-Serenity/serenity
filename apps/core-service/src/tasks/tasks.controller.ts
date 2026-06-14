import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { TaskPriority, TaskSourceType, TaskStatus } from '@prisma/client';
import { CurrentUser } from '../auth/auth.types';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTaskDto, ListTasksResponseDto, TaskDto, UpdateTaskDto } from './dto/task.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List workspace tasks with optional filters' })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'priority', required: false, enum: TaskPriority })
  @ApiQuery({ name: 'sourceType', required: false, enum: TaskSourceType })
  @ApiQuery({ name: 'createdByAi', required: false, type: Boolean })
  @ApiQuery({ name: 'mine', required: false, type: Boolean })
  @ApiQuery({ name: 'dueBefore', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiOkResponse({ type: ListTasksResponseDto })
  listTasks(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: TaskStatus,
    @Query('assigneeId') assigneeId?: string,
    @Query('priority') priority?: TaskPriority,
    @Query('sourceType') sourceType?: TaskSourceType,
    @Query('createdByAi') createdByAi?: string,
    @Query('mine') mine?: string,
    @Query('dueBefore') dueBefore?: string,
    @Query('search') search?: string,
  ) {
    return this.tasksService.listTasks(user.orgId, user.userId, {
      status,
      assigneeId,
      priority,
      sourceType,
      createdByAi: parseBool(createdByAi),
      mine: parseBool(mine),
      dueBefore,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single task' })
  @ApiOkResponse({ type: TaskDto })
  getTask(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.getTask(user.orgId, id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  @ApiBody({ type: CreateTaskDto })
  @ApiCreatedResponse({ type: TaskDto })
  createTask(@CurrentUser() user: AuthUser, @Body() body: CreateTaskDto) {
    return this.tasksService.createTask(user.orgId, user.userId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiOkResponse({ type: TaskDto })
  updateTask(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(user.orgId, id, user.userId, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiNoContentResponse({ description: 'Task deleted' })
  deleteTask(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.deleteTask(user.orgId, id, user.userId);
  }
}

function parseBool(value?: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === 'true' || value === '1';
}
