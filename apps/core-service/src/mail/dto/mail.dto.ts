import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class MailAccountDto {
  @ApiProperty()
    id!: string;

  @ApiProperty()
    email!: string;

  @ApiPropertyOptional()
    displayName!: string | null;

  @ApiProperty()
    provider!: string;

  @ApiProperty()
    status!: string;

  @ApiPropertyOptional({ format: 'date-time' })
    lastSyncedAt!: Date | null;

  @ApiPropertyOptional()
    lastError!: string | null;
}

export class ListMailAccountsResponseDto {
  @ApiProperty({ type: [MailAccountDto] })
    accounts!: MailAccountDto[];
}

export class MailConnectResponseDto {
  @ApiProperty()
    url!: string;
}

export class MailAttachmentDto {
  @ApiProperty()
    id!: string;

  @ApiProperty()
    filename!: string;

  @ApiPropertyOptional()
    mimeType!: string | null;

  @ApiPropertyOptional()
    size!: number | null;
}

export class MailMessageDto {
  @ApiProperty()
    id!: string;

  @ApiProperty()
    direction!: string;

  @ApiProperty()
    subject!: string;

  @ApiPropertyOptional()
    snippet!: string | null;

  @ApiPropertyOptional()
    bodyText!: string | null;

  @ApiPropertyOptional()
    bodyHtml!: string | null;

  @ApiPropertyOptional()
    fromName!: string | null;

  @ApiPropertyOptional()
    fromEmail!: string | null;

  @ApiProperty({ type: [String] })
    toEmails!: string[];

  @ApiProperty({ type: [String] })
    ccEmails!: string[];

  @ApiProperty({ type: [MailAttachmentDto] })
    attachments!: MailAttachmentDto[];

  @ApiPropertyOptional({ format: 'date-time' })
    sentAt!: Date | null;
}

export class MailThreadDto {
  @ApiProperty()
    id!: string;

  @ApiProperty()
    accountId!: string;

  @ApiProperty()
    subject!: string;

  @ApiPropertyOptional()
    snippet!: string | null;

  @ApiPropertyOptional()
    fromName!: string | null;

  @ApiPropertyOptional()
    fromEmail!: string | null;

  @ApiProperty()
    unread!: boolean;

  @ApiProperty()
    starred!: boolean;

  @ApiProperty()
    archived!: boolean;

  @ApiProperty()
    trashed!: boolean;

  @ApiPropertyOptional({ format: 'date-time' })
    lastMessageAt!: Date | null;
}

export class ListMailThreadsResponseDto {
  @ApiProperty({ type: [MailThreadDto] })
    threads!: MailThreadDto[];

  @ApiPropertyOptional()
    nextCursor!: string | null;
}

export class MailThreadDetailDto extends MailThreadDto {
  @ApiProperty({ type: [MailMessageDto] })
    messages!: MailMessageDto[];
}

export class ListMailThreadsQueryDto {
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

export class SendMailDto {
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

export class ReplyMailDto {
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

export class ForwardMailDto extends SendMailDto {}

export class MailActionResponseDto {
  @ApiProperty()
    success!: boolean;
}
