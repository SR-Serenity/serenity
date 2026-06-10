import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactStatus, ContactType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ContactDto {
  @ApiProperty()
    id!: string;

  @ApiProperty({ enum: ContactType, enumName: 'ContactType' })
    type!: ContactType;

  @ApiProperty({ enum: ContactStatus, enumName: 'ContactStatus' })
    status!: ContactStatus;

  @ApiProperty()
    displayName!: string;

  @ApiPropertyOptional()
    email!: string | null;

  @ApiPropertyOptional()
    phone!: string | null;

  @ApiPropertyOptional()
    company!: string | null;

  @ApiPropertyOptional()
    title!: string | null;

  @ApiPropertyOptional()
    role!: string | null;

  @ApiPropertyOptional()
    departmentId!: string | null;

  @ApiPropertyOptional()
    departmentName!: string | null;

  @ApiPropertyOptional()
    notes!: string | null;

  @ApiPropertyOptional()
    sourceUserId!: string | null;

  @ApiProperty({ format: 'date-time' })
    createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
    updatedAt!: Date;
}

export class ListContactsResponseDto {
  @ApiProperty({ type: [ContactDto] })
    contacts!: ContactDto[];
}

export class CreateContactDto {
  @ApiProperty({ enum: ['GUEST', 'AI_AGENT'], enumName: 'ContactType' })
  @IsEnum(ContactType)
    type!: Extract<ContactType, 'GUEST' | 'AI_AGENT'>;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
    displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
    email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
    phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
    company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
    title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
    notes?: string;
}

export class UpdateContactDto {
  @ApiPropertyOptional({ enum: ContactStatus, enumName: 'ContactStatus' })
  @IsOptional()
  @IsEnum(ContactStatus)
    status?: ContactStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
    displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
    email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
    phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
    company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
    title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    departmentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
    notes?: string | null;
}
