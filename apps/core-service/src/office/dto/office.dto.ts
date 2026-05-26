import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
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
