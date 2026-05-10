import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBase64,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChatConversationType } from '@prisma/client';

export class CreateChannelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
    name!: string;

  @ApiProperty({
    enum: [ChatConversationType.PUBLIC_CHANNEL, ChatConversationType.PRIVATE_CHANNEL],
  })
  @IsEnum(ChatConversationType)
    type!: 'PUBLIC_CHANNEL' | 'PRIVATE_CHANNEL';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
    memberIds?: string[];
}

export class CreateDmDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
    memberIds!: string[];
}

export class CreateMessageDto {
  @ApiProperty()
  @IsString()
  @MaxLength(8000)
    content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    parentId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
    attachmentIds?: string[];
}

export class CreateAttachmentUploadIntentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
    filename!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
    contentType!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(50_000_000)
    size!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
    conversationId!: string;
}

export class CompleteAttachmentUploadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
    publicId!: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
    secureUrl!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(50_000_000)
    bytes!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
    resourceType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
    format?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
    width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
    height?: number;
}

export class AddReactionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
    emoji!: string;
}

export class EditMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
    content!: string;
}

export class CursorQueryDto {
  @ApiPropertyOptional({ description: 'Pagination cursor token' })
  @IsOptional()
  @IsBase64()
    cursor?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
    limit?: number;
}
