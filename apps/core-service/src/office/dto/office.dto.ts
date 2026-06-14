import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { OfficeRoomType } from '@prisma/client';

export class CreateRoomDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
    name!: string;

  @ApiPropertyOptional({ enum: OfficeRoomType })
  @IsOptional()
  @IsEnum(OfficeRoomType)
    type?: OfficeRoomType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
    icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
    maxCapacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
    position?: { x: number; y: number };
}

export class UpdateRoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
    name?: string;

  @ApiPropertyOptional({ enum: OfficeRoomType })
  @IsOptional()
  @IsEnum(OfficeRoomType)
    type?: OfficeRoomType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
    icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
    maxCapacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
    position?: { x: number; y: number };
}

export class UpdateMeetingNoteDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50000)
    contentMarkdown!: string;
}

export class SummarizeMeetingNoteDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50000)
    transcriptMarkdown!: string;
}

export class TranscribeMeetingRecordingDto {
  @ApiProperty()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
    audioUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
    model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
    language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
    prompt?: string;
}

export class StartLiveTranscriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
    model?: string;
}

export class LiveTranscriptSegmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
    orgId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
    roomId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
    speaker!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(5000)
    text!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
    startedAtMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
    endedAtMs?: number;
}
