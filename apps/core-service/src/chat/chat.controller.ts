import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/auth.types';
import type { AuthUser } from '../auth/auth.types';
import { ChatService } from './chat.service';
import {
  AddReactionDto,
  AddConversationMembersDto,
  CompleteAttachmentUploadDto,
  CreateAttachmentUploadIntentDto,
  CreateChannelDto,
  CreateDmDto,
  CreateMessageDto,
  CursorPageDto,
  EditMessageDto,
  ListConversationAssetsDto,
  ListMessagesDto,
} from './dto/chat.dto';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations/list')
  @ApiOperation({ summary: 'List accessible chat conversations' })
  listConversations(@CurrentUser() user: AuthUser, @Body() body: CursorPageDto) {
    return this.chatService.listConversations(user, body);
  }

  @Post('channels')
  @ApiOperation({ summary: 'Create a public or private channel' })
  createChannel(@CurrentUser() user: AuthUser, @Body() body: CreateChannelDto) {
    return this.chatService.createChannel(user, body);
  }

  @Post('dms')
  @ApiOperation({ summary: 'Create a direct message conversation' })
  createDm(@CurrentUser() user: AuthUser, @Body() body: CreateDmDto) {
    return this.chatService.createDm(user, body);
  }

  @Post('conversations/:conversationId/members')
  @ApiOperation({ summary: 'Add members to a group chat conversation' })
  addConversationMembers(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Body() body: AddConversationMembersDto,
  ) {
    return this.chatService.addConversationMembers(user, conversationId, body);
  }

  @Post('conversations/:conversationId/assets/list')
  @ApiOperation({ summary: 'List sent files or documents for a conversation' })
  listConversationAssets(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Body() body: ListConversationAssetsDto,
  ) {
    return this.chatService.listConversationAssets(user, conversationId, body);
  }

  @Post('attachments/upload-intent')
  @ApiOperation({ summary: 'Create a Cloudinary upload intent for a chat attachment' })
  createUploadIntent(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateAttachmentUploadIntentDto,
  ) {
    return this.chatService.createUploadIntent(user, body);
  }

  @Post('attachments/:attachmentId/complete')
  @ApiOperation({ summary: 'Complete a direct Cloudinary chat attachment upload' })
  completeAttachmentUpload(
    @CurrentUser() user: AuthUser,
    @Param('attachmentId') attachmentId: string,
    @Body() body: CompleteAttachmentUploadDto,
  ) {
    return this.chatService.completeAttachmentUpload(user, attachmentId, body);
  }

  @Post('conversations/:conversationId/messages/list')
  @ApiOperation({ summary: 'List root messages or thread replies' })
  listMessages(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Body() body: ListMessagesDto,
  ) {
    return this.chatService.listMessages(user, conversationId, body.parentId, body);
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Create a message or thread reply' })
  createMessage(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Body() body: CreateMessageDto
  ) {
    return this.chatService.createMessage(user, conversationId, body);
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit a message' })
  editMessage(
    @CurrentUser() user: AuthUser,
    @Param('messageId') messageId: string,
    @Body() body: EditMessageDto,
  ) {
    return this.chatService.editMessage(user, messageId, body);
  }

  @Post('messages/:messageId/unsend')
  @ApiOperation({ summary: 'Unsend a message for everyone' })
  unsendMessage(
    @CurrentUser() user: AuthUser,
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.unsendMessage(user, messageId);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message for current user' })
  deleteMessageForMe(
    @CurrentUser() user: AuthUser,
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.deleteMessageForMe(user, messageId);
  }

  @Post('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Add a reaction to a message' })
  addReaction(
    @CurrentUser() user: AuthUser,
    @Param('messageId') messageId: string,
    @Body() body: AddReactionDto
  ) {
    return this.chatService.addReaction(user, messageId, body);
  }

  @Delete('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Remove a reaction from a message' })
  removeReaction(
    @CurrentUser() user: AuthUser,
    @Param('messageId') messageId: string,
    @Body() body: AddReactionDto,
  ) {
    return this.chatService.removeReaction(user, messageId, body.emoji);
  }
}
