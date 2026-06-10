import { Body, Controller, Delete, Get, Param, Post, Query, Redirect, StreamableFile, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.types';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ForwardMailDto,
  ListMailAccountsResponseDto,
  ListMailThreadsQueryDto,
  ListMailThreadsResponseDto,
  MailActionResponseDto,
  MailConnectResponseDto,
  MailThreadDetailDto,
  ReplyMailDto,
  SendMailDto,
} from './dto/mail.dto';
import { MailService } from './mail.service';

@ApiTags('mail')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List connected mail accounts' })
  @ApiOkResponse({ type: ListMailAccountsResponseDto })
  listAccounts(@CurrentUser() user: AuthUser) {
    return this.mailService.listAccounts(user.orgId, user.userId);
  }

  @Post('google/connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Google OAuth URL for Gmail connect' })
  @ApiCreatedResponse({ type: MailConnectResponseDto })
  connectGoogle(@CurrentUser() user: AuthUser, @Body() body: { returnTo?: string }) {
    return this.mailService.connectGoogle(user.orgId, user.userId, body.returnTo);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  @Redirect()
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    const redirectTo = await this.mailService.handleGoogleCallback(code, state);
    return { url: redirectTo };
  }

  @Delete('accounts/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect mail account' })
  @ApiOkResponse({ type: MailActionResponseDto })
  disconnect(@CurrentUser() user: AuthUser, @Param('accountId') accountId: string) {
    return this.mailService.disconnectAccount(user.orgId, user.userId, accountId);
  }

  @Get('threads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List mail threads' })
  @ApiOkResponse({ type: ListMailThreadsResponseDto })
  listThreads(@CurrentUser() user: AuthUser, @Query() query: ListMailThreadsQueryDto) {
    return this.mailService.listThreads(user.orgId, user.userId, query);
  }

  @Get('threads/:threadId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get mail thread detail' })
  @ApiOkResponse({ type: MailThreadDetailDto })
  getThread(@CurrentUser() user: AuthUser, @Param('threadId') threadId: string) {
    return this.mailService.getThread(user.orgId, user.userId, threadId);
  }

  @Get('attachments/:attachmentId/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download a Gmail attachment' })
  async downloadAttachment(
    @CurrentUser() user: AuthUser,
    @Param('attachmentId') attachmentId: string,
  ) {
    const attachment = await this.mailService.downloadAttachment(
      user.orgId,
      user.userId,
      attachmentId
    );
    const filename = attachment.filename.replace(/["\r\n]/g, '_');
    return new StreamableFile(attachment.buffer, {
      type: attachment.mimeType,
      length: attachment.buffer.length,
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('messages/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiBody({ type: SendMailDto })
  @ApiOperation({ summary: 'Send email' })
  @ApiOkResponse({ type: MailActionResponseDto })
  send(@CurrentUser() user: AuthUser, @Body() body: SendMailDto) {
    return this.mailService.send(user.orgId, user.userId, body);
  }

  @Post('threads/:threadId/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiBody({ type: ReplyMailDto })
  @ApiOperation({ summary: 'Reply to a thread' })
  @ApiOkResponse({ type: MailActionResponseDto })
  reply(@CurrentUser() user: AuthUser, @Param('threadId') threadId: string, @Body() body: ReplyMailDto) {
    return this.mailService.reply(user.orgId, user.userId, threadId, body);
  }

  @Post('threads/:threadId/forward')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiBody({ type: ForwardMailDto })
  @ApiOperation({ summary: 'Forward a thread' })
  @ApiOkResponse({ type: MailActionResponseDto })
  forward(@CurrentUser() user: AuthUser, @Param('threadId') threadId: string, @Body() body: ForwardMailDto) {
    return this.mailService.forward(user.orgId, user.userId, threadId, body);
  }

  @Post('threads/:threadId/:action')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run mail thread action' })
  @ApiOkResponse({ type: MailActionResponseDto })
  action(
    @CurrentUser() user: AuthUser,
    @Param('threadId') threadId: string,
    @Param('action') action: string,
  ) {
    return this.mailService.modifyThread(user.orgId, user.userId, threadId, action);
  }

  @Post('webhooks/google/pubsub')
  @ApiOperation({ summary: 'Google Pub/Sub Gmail push webhook' })
  googlePubSub(@Body() body: unknown) {
    return this.mailService.handlePubSubPush(body);
  }
}
