import { Controller, Get, Param, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('organizations/:orgId/channels')
  @ApiOperation({ summary: 'Get all channels in an organization' })
  getChannels(@Param('orgId') orgId: string) {
    return this.chatService.getChannels(orgId);
  }

  @Get('channels/:channelId/messages')
  @ApiOperation({ summary: 'Get messages for a channel' })
  getChannelMessages(
    @Param('channelId') channelId: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string
  ) {
    return this.chatService.getChannelMessages(channelId, limit ? +limit : 50, cursor);
  }

  @Get('messages/:messageId/thread')
  @ApiOperation({ summary: 'Get thread messages for a parent message' })
  getThreadMessages(@Param('messageId') messageId: string) {
    return this.chatService.getThreadMessages(messageId);
  }

  @Get('members/:memberId/conversations')
  @ApiOperation({ summary: 'Get all conversations for a member' })
  getConversations(@Param('memberId') memberId: string) {
    return this.chatService.getConversations(memberId);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  getConversationMessages(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string
  ) {
    return this.chatService.getConversationMessages(conversationId, limit ? +limit : 50, cursor);
  }
}
