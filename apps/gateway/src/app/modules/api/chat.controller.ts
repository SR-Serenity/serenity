import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProxyService } from './api-proxy.service';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly apiProxy: ApiProxyService) {}

  @Get('organizations/:orgId/channels')
  @ApiOperation({ summary: 'Get all channels in an organization' })
  async getChannels(
    @Param('orgId') orgId: string,
    @Headers('authorization') authorization: string
  ) {
    return this.apiProxy.forwardGetRequest(`chat/organizations/${orgId}/channels`, authorization);
  }

  @Get('channels/:channelId/messages')
  @ApiOperation({ summary: 'Get messages for a channel' })
  async getChannelMessages(
    @Param('channelId') channelId: string,
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string
  ) {
    let path = `chat/channels/${channelId}/messages?limit=${limit || 50}`;
    if (cursor) path += `&cursor=${cursor}`;
    return this.apiProxy.forwardGetRequest(path, authorization);
  }

  @Get('messages/:messageId/thread')
  @ApiOperation({ summary: 'Get thread messages' })
  async getThreadMessages(
    @Param('messageId') messageId: string,
    @Headers('authorization') authorization: string
  ) {
    return this.apiProxy.forwardGetRequest(`chat/messages/${messageId}/thread`, authorization);
  }

  @Get('members/:memberId/conversations')
  @ApiOperation({ summary: 'Get conversations for a member' })
  async getConversations(
    @Param('memberId') memberId: string,
    @Headers('authorization') authorization: string
  ) {
    return this.apiProxy.forwardGetRequest(`chat/members/${memberId}/conversations`, authorization);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  async getConversationMessages(
    @Param('conversationId') conversationId: string,
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string
  ) {
    let path = `chat/conversations/${conversationId}/messages?limit=${limit || 50}`;
    if (cursor) path += `&cursor=${cursor}`;
    return this.apiProxy.forwardGetRequest(path, authorization);
  }
}
