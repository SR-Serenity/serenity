import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
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

  @Post('conversations/list')
  @ApiOperation({ summary: 'List accessible chat conversations' })
  listConversations(
    @Req() req: RequestWithAuth,
    @Body() body: unknown,
  ) {
    return this.apiProxy.forwardPostRequest(
      'chat/conversations/list',
      body,
      req.headers.authorization,
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

  @Post('conversations/:conversationId/members')
  @ApiOperation({ summary: 'Add members to a group chat conversation' })
  addConversationMembers(
    @Req() req: RequestWithAuth,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown,
  ) {
    return this.apiProxy.forwardPostRequest(
      `chat/conversations/${conversationId}/members`,
      body,
      req.headers.authorization,
    );
  }

  @Post('conversations/:conversationId/assets/list')
  @ApiOperation({ summary: 'List sent files or documents for a conversation' })
  listConversationAssets(
    @Req() req: RequestWithAuth,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown,
  ) {
    return this.apiProxy.forwardPostRequest(
      `chat/conversations/${conversationId}/assets/list`,
      body,
      req.headers.authorization,
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

  @Post('conversations/:conversationId/messages/list')
  @ApiOperation({ summary: 'List root messages or thread replies' })
  listMessages(
    @Req() req: RequestWithAuth,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown,
  ) {
    return this.apiProxy.forwardPostRequest(
      `chat/conversations/${conversationId}/messages/list`,
      body,
      req.headers.authorization,
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

  @Delete('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Remove a reaction from a message' })
  removeReaction(
    @Req() req: RequestWithAuth,
    @Param('messageId') messageId: string,
    @Body() body: unknown,
  ) {
    return this.apiProxy.forwardDeleteRequest(
      `chat/messages/${messageId}/reactions`,
      req.headers.authorization,
      body,
    );
  }
}
