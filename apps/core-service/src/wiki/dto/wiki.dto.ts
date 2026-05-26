import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma, WikiPageVisibility, WikiSharePermission } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class WikiPageShareUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() email!: string;
}

export class WikiPageShareDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() userName!: string;
  @ApiProperty() userEmail!: string;
  @ApiProperty({ enum: WikiSharePermission, enumName: 'WikiSharePermission' })
    permission!: WikiSharePermission;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}

export class ListWikiSharesResponseDto {
  @ApiProperty({ type: [WikiPageShareDto] }) shares!: WikiPageShareDto[];
}

export class ShareWikiPageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
    userId!: string;

  @ApiProperty({ enum: WikiSharePermission, enumName: 'WikiSharePermission' })
  @IsEnum(WikiSharePermission)
    permission!: WikiSharePermission;
}

export class UpdateShareDto {
  @ApiProperty({ enum: WikiSharePermission, enumName: 'WikiSharePermission' })
  @IsEnum(WikiSharePermission)
    permission!: WikiSharePermission;
}

export class WikiPageDto {
  @ApiProperty()
    id!: string;

  @ApiPropertyOptional()
    parentId!: string | null;

  @ApiProperty()
    createdById!: string;

  @ApiProperty()
    title!: string;

  @ApiPropertyOptional()
    icon!: string | null;

  @ApiPropertyOptional()
    coverColor!: string | null;

  @ApiProperty()
    contentMarkdown!: string;

  @ApiPropertyOptional()
    contentJson!: unknown | null;

  @ApiProperty({ enum: WikiPageVisibility, enumName: 'WikiPageVisibility' })
    visibility!: WikiPageVisibility;

  @ApiPropertyOptional()
    departmentId!: string | null;

  @ApiPropertyOptional()
    departmentName!: string | null;

  @ApiProperty()
    favorite!: boolean;

  @ApiProperty()
    canEdit!: boolean;

  @ApiProperty({ type: [WikiPageShareDto] })
    shares!: WikiPageShareDto[];

  @ApiProperty({ format: 'date-time' })
    createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
    updatedAt!: Date;
}

export class ListWikiPagesResponseDto {
  @ApiProperty({ type: [WikiPageDto] })
    pages!: WikiPageDto[];
}

export class DeleteWikiPageResponseDto {
  @ApiProperty()
    success!: boolean;
}

export class WikiFavoriteResponseDto {
  @ApiProperty()
    favorite!: boolean;
}

export class CreateWikiPageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
    title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    parentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
    icon?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
    coverColor?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80000)
    contentMarkdown?: string | null;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' }, nullable: true })
  @IsOptional()
  @IsArray()
    contentJson?: Prisma.InputJsonValue[] | null;

  @ApiProperty({ enum: WikiPageVisibility, enumName: 'WikiPageVisibility' })
  @IsEnum(WikiPageVisibility)
    visibility!: WikiPageVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    departmentId?: string | null;
}

export class UpdateWikiPageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
    title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    parentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
    icon?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
    coverColor?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80000)
    contentMarkdown?: string | null;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' }, nullable: true })
  @IsOptional()
  @IsArray()
    contentJson?: Prisma.InputJsonValue[] | null;

  @ApiPropertyOptional({ enum: WikiPageVisibility, enumName: 'WikiPageVisibility' })
  @IsOptional()
  @IsEnum(WikiPageVisibility)
    visibility?: WikiPageVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    departmentId?: string | null;
}
