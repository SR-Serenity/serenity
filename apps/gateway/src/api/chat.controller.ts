import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProxyService } from './api-proxy.service';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly apiProxy: ApiProxyService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List accessible chat conversations' })
  listConversations(
    @Req() req: RequestWithAuth,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const params = {
      ...(cursor ? { cursor } : {}),
      ...(limit ? { limit } : {}),
    };
    return this.apiProxy.forwardGetRequest(
      'chat/conversations',
      req.headers.authorization,
      Object.keys(params).length > 0 ? params : undefined,
    );
  }

  @Post('channels')
  @ApiOperation({ summary: 'Create a public or private channel' })
  createChannel(@Req() req: RequestWithAuth, @Body() body: unknown) {
    return this.apiProxy.forwardPostRequest(
      'chat/channels',
      body,
      req.headers.authorization
    );
  }

  @Post('dms')
  @ApiOperation({ summary: 'Create a direct message conversation' })
  createDm(@Req() req: RequestWithAuth, @Body() body: unknown) {
    return this.apiProxy.forwardPostRequest(
      'chat/dms',
      body,
      req.headers.authorization
    );
  }

  @Post('attachments/upload-intent')
  @ApiOperation({ summary: 'Create a Cloudinary upload intent for a chat attachment' })
  createUploadIntent(
    @Req() req: RequestWithAuth,
    @Body() body: unknown,
  ) {
    return this.apiProxy.forwardPostRequest(
      'chat/attachments/upload-intent',
      body,
      req.headers.authorization,
    );
  }

  @Post('attachments/:attachmentId/complete')
  @ApiOperation({ summary: 'Complete a direct Cloudinary chat attachment upload' })
  completeAttachmentUpload(
    @Req() req: RequestWithAuth,
    @Param('attachmentId') attachmentId: string,
    @Body() body: unknown,
  ) {
    return this.apiProxy.forwardPostRequest(
      `chat/attachments/${attachmentId}/complete`,
      body,
      req.headers.authorization,
    );
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'List root messages or thread replies' })
  listMessages(
    @Req() req: RequestWithAuth,
    @Param('conversationId') conversationId: string,
    @Query('parentId') parentId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const params = {
      ...(parentId ? { parentId } : {}),
      ...(cursor ? { cursor } : {}),
      ...(limit ? { limit } : {}),
    };
    return this.apiProxy.forwardGetRequest(
      `chat/conversations/${conversationId}/messages`,
      req.headers.authorization,
      Object.keys(params).length > 0 ? params : undefined
    );
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Create a message or thread reply' })
  createMessage(
    @Req() req: RequestWithAuth,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown
  ) {
    return this.apiProxy.forwardPostRequest(
      `chat/conversations/${conversationId}/messages`,
      body,
      req.headers.authorization
    );
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit a message' })
  editMessage(
    @Req() req: RequestWithAuth,
    @Param('messageId') messageId: string,
    @Body() body: unknown,
  ) {
    return this.apiProxy.forwardPatchRequest(
      `chat/messages/${messageId}`,
      body,
      req.headers.authorization,
    );
  }

  @Post('messages/:messageId/unsend')
  @ApiOperation({ summary: 'Unsend a message for everyone' })
  unsendMessage(
    @Req() req: RequestWithAuth,
    @Param('messageId') messageId: string,
  ) {
    return this.apiProxy.forwardPostRequest(
      `chat/messages/${messageId}/unsend`,
      {},
      req.headers.authorization,
    );
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message for current user' })
  deleteMessageForMe(
    @Req() req: RequestWithAuth,
    @Param('messageId') messageId: string,
  ) {
    return this.apiProxy.forwardDeleteRequest(
      `chat/messages/${messageId}`,
      req.headers.authorization,
    );
  }

  @Post('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Add a reaction to a message' })
  addReaction(
    @Req() req: RequestWithAuth,
    @Param('messageId') messageId: string,
    @Body() body: unknown
  ) {
    return this.apiProxy.forwardPostRequest(
      `chat/messages/${messageId}/reactions`,
      body,
      req.headers.authorization
    );
  }

  @Delete('messages/:messageId/reactions/:emoji')
  @ApiOperation({ summary: 'Remove a reaction from a message' })
  removeReaction(
    @Req() req: RequestWithAuth,
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string
  ) {
    return this.apiProxy.forwardDeleteRequest(
      `chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
      req.headers.authorization
    );
  }
}
