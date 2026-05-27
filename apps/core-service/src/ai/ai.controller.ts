import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.types';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AppendAiMessagesDto,
  CreateAiSessionDto,
  UpdateAiSessionDto,
} from './dto/ai.dto';
import { AiService } from './ai.service';

@ApiTags('ai-sessions')
@ApiBearerAuth()
@Controller('ai/sessions')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get()
  @ApiOperation({ summary: 'List AI chat sessions for current user/org' })
  listSessions(@CurrentUser() user: AuthUser) {
    return this.aiService.listSessions(user.orgId, user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new AI chat session' })
  createSession(@CurrentUser() user: AuthUser, @Body() body: CreateAiSessionDto) {
    return this.aiService.createSession(user.orgId, user.userId, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get AI chat session with messages' })
  getSession(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.aiService.getSession(user.orgId, user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update AI session title' })
  updateSession(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateAiSessionDto,
  ) {
    return this.aiService.updateSession(user.orgId, user.userId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete AI chat session' })
  deleteSession(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.aiService.deleteSession(user.orgId, user.userId, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Append messages to AI chat session' })
  appendMessages(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: AppendAiMessagesDto,
  ) {
    return this.aiService.appendMessages(user.orgId, user.userId, id, body);
  }
}
