import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProxyService } from './api-proxy.service';

type RequestWithAuth = {
  headers: { authorization?: string };
};

class ConnectGoogleBodyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    returnTo?: string;
}

class ListMailThreadsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    accountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
    q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    cursor?: string;

  @ApiPropertyOptional({ enum: ['read', 'unread'] })
  @IsOptional()
  @IsIn(['read', 'unread'])
    read?: 'read' | 'unread';
}

class SendMailBodyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    accountId?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(100)
  @IsEmail({}, { each: true })
    to!: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsEmail({}, { each: true })
    cc?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsEmail({}, { each: true })
    bcc?: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
    subject!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
    body!: string;
}

class ReplyMailBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
    body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
    replyAll?: boolean;
}

class ForwardMailBodyDto extends SendMailBodyDto {}

@ApiTags('mail')
@ApiBearerAuth()
@Controller('mail')
export class MailController {
  constructor(private readonly apiProxy: ApiProxyService) {}

  @Get('accounts')
  @ApiOperation({ summary: 'List mail accounts' })
  @ApiOkResponse({ description: 'Mail accounts retrieved' })
  listAccounts(@Req() req: RequestWithAuth) {
    return this.apiProxy.forwardGetRequest('mail/accounts', req.headers.authorization);
  }

  @Post('google/connect')
  @ApiOperation({ summary: 'Create Gmail connect URL' })
  @ApiBody({ type: ConnectGoogleBodyDto })
  @ApiCreatedResponse({ description: 'Connect URL created' })
  connectGoogle(@Req() req: RequestWithAuth, @Body() body: ConnectGoogleBodyDto) {
    return this.apiProxy.forwardPostRequest('mail/google/connect', body, req.headers.authorization);
  }

  @Delete('accounts/:accountId')
  @ApiOperation({ summary: 'Disconnect mail account' })
  @ApiOkResponse({ description: 'Mail account disconnected' })
  disconnect(@Req() req: RequestWithAuth, @Param('accountId') accountId: string) {
    return this.apiProxy.forwardDeleteRequest(`mail/accounts/${accountId}`, req.headers.authorization);
  }

  @Get('threads')
  @ApiOperation({ summary: 'List mail threads' })
  @ApiOkResponse({ description: 'Mail threads retrieved' })
  listThreads(@Req() req: RequestWithAuth, @Query() query: ListMailThreadsQueryDto) {
    return this.apiProxy.forwardGetRequest('mail/threads', req.headers.authorization, { ...query });
  }

  @Get('threads/:threadId')
  @ApiOperation({ summary: 'Get mail thread' })
  @ApiOkResponse({ description: 'Mail thread retrieved' })
  getThread(@Req() req: RequestWithAuth, @Param('threadId') threadId: string) {
    return this.apiProxy.forwardGetRequest(`mail/threads/${threadId}`, req.headers.authorization);
  }

  @Post('messages/send')
  @ApiOperation({ summary: 'Send email' })
  @ApiBody({ type: SendMailBodyDto })
  @ApiOkResponse({ description: 'Email sent' })
  send(@Req() req: RequestWithAuth, @Body() body: SendMailBodyDto) {
    return this.apiProxy.forwardPostRequest('mail/messages/send', body, req.headers.authorization);
  }

  @Post('threads/:threadId/reply')
  @ApiOperation({ summary: 'Reply to email thread' })
  @ApiBody({ type: ReplyMailBodyDto })
  @ApiOkResponse({ description: 'Reply sent' })
  reply(@Req() req: RequestWithAuth, @Param('threadId') threadId: string, @Body() body: ReplyMailBodyDto) {
    return this.apiProxy.forwardPostRequest(`mail/threads/${threadId}/reply`, body, req.headers.authorization);
  }

  @Post('threads/:threadId/forward')
  @ApiOperation({ summary: 'Forward email thread' })
  @ApiBody({ type: ForwardMailBodyDto })
  @ApiOkResponse({ description: 'Thread forwarded' })
  forward(@Req() req: RequestWithAuth, @Param('threadId') threadId: string, @Body() body: ForwardMailBodyDto) {
    return this.apiProxy.forwardPostRequest(`mail/threads/${threadId}/forward`, body, req.headers.authorization);
  }

  @Post('threads/:threadId/:action')
  @ApiOperation({ summary: 'Run mail thread action' })
  @ApiOkResponse({ description: 'Mail action applied' })
  action(@Req() req: RequestWithAuth, @Param('threadId') threadId: string, @Param('action') action: string) {
    return this.apiProxy.forwardPostRequest(`mail/threads/${threadId}/${action}`, {}, req.headers.authorization);
  }
}
