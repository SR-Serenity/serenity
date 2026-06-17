import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ServerResponse } from 'http';
import { ApiProxyService } from './api-proxy.service';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly apiProxy: ApiProxyService) {}

  // ── AI inference endpoints (proxy to ai-service) ──────────────────────────

  @Post('chat')
  @ApiOperation({ summary: 'Chat with Serenity AI' })
  chat(@Req() req: RequestWithAuth, @Body() body: unknown) {
    return this.apiProxy.forwardAiPostRequest(
      'ai/chat',
      body,
      req.headers.authorization,
    );
  }

  @Post('chat/stream')
  @ApiOperation({ summary: 'Stream chat responses from Serenity AI' })
  chatStream(
    @Req() req: RequestWithAuth,
    @Body() body: unknown,
    @Res() res: ServerResponse,
  ) {
    return this.apiProxy.forwardAiStreamPostRequest(
      'ai/chat/stream',
      body,
      res,
      req.headers.authorization,
    );
  }

  @Post('chat/assist')
  @ApiOperation({ summary: 'Inline AI assistant for messaging channels' })
  chatAssist(@Req() req: RequestWithAuth, @Body() body: unknown) {
    return this.apiProxy.forwardAiPostRequest(
      'ai/chat/assist',
      body,
      req.headers.authorization,
    );
  }

  @Post('tasks/extract')
  @ApiOperation({ summary: 'Extract follow-up task proposals from a conversation' })
  extractTasks(@Req() req: RequestWithAuth, @Body() body: unknown) {
    return this.apiProxy.forwardAiPostRequest(
      'ai/tasks/extract',
      body,
      req.headers.authorization,
    );
  }

  @Post('files/index')
  @ApiOperation({ summary: 'Index an uploaded file for Serenity AI' })
  indexFile(@Req() req: RequestWithAuth, @Body() body: unknown) {
    return this.apiProxy.forwardAiPostRequest(
      'ai/files/index',
      body,
      req.headers.authorization,
    );
  }

  @Post('files/ask')
  @ApiOperation({ summary: 'Ask Serenity AI about indexed files' })
  askFile(@Req() req: RequestWithAuth, @Body() body: unknown) {
    return this.apiProxy.forwardAiPostRequest(
      'ai/files/ask',
      body,
      req.headers.authorization,
    );
  }

  @Post('wiki/edit')
  @ApiOperation({ summary: 'Inline wiki AI command: apply a prompt to the current page' })
  editWikiPage(@Req() req: RequestWithAuth, @Body() body: unknown) {
    return this.apiProxy.forwardAiPostRequest(
      'ai/wiki/edit',
      body,
      req.headers.authorization,
    );
  }

  // ── AI session persistence endpoints (proxy to core-service) ─────────────

  @Get('sessions')
  @ApiOperation({ summary: 'List AI chat sessions' })
  listSessions(@Req() req: RequestWithAuth) {
    return this.apiProxy.forwardGetRequest('ai/sessions', req.headers.authorization);
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Create AI chat session' })
  createSession(@Req() req: RequestWithAuth, @Body() body: unknown) {
    return this.apiProxy.forwardPostRequest(
      'ai/sessions',
      body,
      req.headers.authorization,
    );
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get AI chat session with messages' })
  getSession(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.apiProxy.forwardGetRequest(`ai/sessions/${id}`, req.headers.authorization);
  }

  @Patch('sessions/:id')
  @ApiOperation({ summary: 'Update AI session title' })
  updateSession(@Param('id') id: string, @Req() req: RequestWithAuth, @Body() body: unknown) {
    return this.apiProxy.forwardPatchRequest(
      `ai/sessions/${id}`,
      body,
      req.headers.authorization,
    );
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Delete AI chat session' })
  deleteSession(@Param('id') id: string, @Req() req: RequestWithAuth) {
    return this.apiProxy.forwardDeleteRequest(
      `ai/sessions/${id}`,
      req.headers.authorization,
    );
  }

  @Post('sessions/:id/messages')
  @ApiOperation({ summary: 'Append messages to AI chat session' })
  appendMessages(@Param('id') id: string, @Req() req: RequestWithAuth, @Body() body: unknown) {
    return this.apiProxy.forwardPostRequest(
      `ai/sessions/${id}/messages`,
      body,
      req.headers.authorization,
    );
  }

  @Patch('sessions/:id/messages/:messageId')
  @ApiOperation({ summary: 'Update a specific message in an AI chat session' })
  updateMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Req() req: RequestWithAuth,
    @Body() body: unknown,
  ) {
    return this.apiProxy.forwardPatchRequest(
      `ai/sessions/${id}/messages/${messageId}`,
      body,
      req.headers.authorization,
    );
  }
}
