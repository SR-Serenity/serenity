import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterBodyDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
    email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
    password!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
    displayName!: string;

  @ApiProperty({ example: 'My Organization' })
  @IsString()
  @IsNotEmpty()
    orgName!: string;

  @ApiProperty({ example: 'my-org' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
    orgSlug!: string;
}

export class LoginBodyDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
    email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
    password!: string;

  @ApiPropertyOptional({ example: 'my-org' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
    orgSlug?: string;
}

export class AuthUserDto {
  @ApiProperty()
    id!: string;

  @ApiProperty()
    email!: string;

  @ApiProperty()
    displayName!: string;
}

export class AuthOrganizationDto {
  @ApiProperty()
    id!: string;

  @ApiProperty()
    name!: string;

  @ApiProperty()
    slug!: string;
}

export class AuthOrganizationWithRoleDto extends AuthOrganizationDto {
  @ApiProperty()
    role!: string;
}

export class AuthResponseDto {
  @ApiProperty()
    accessToken!: string;

  @ApiProperty()
    tokenType!: string;

  @ApiPropertyOptional({ type: AuthUserDto })
    user?: AuthUserDto;

  @ApiPropertyOptional({ type: AuthOrganizationDto })
    organization?: AuthOrganizationDto;

  @ApiPropertyOptional({ type: [AuthOrganizationWithRoleDto] })
    organizations?: AuthOrganizationWithRoleDto[];
}
