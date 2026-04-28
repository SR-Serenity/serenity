import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterBodyDto {
  @ApiProperty({ example: 'user@example.com' })
    email!: string;

  @ApiProperty({ example: 'password123' })
    password!: string;

  @ApiProperty({ example: 'John Doe' })
    displayName!: string;

  @ApiProperty({ example: 'My Organization' })
    orgName!: string;

  @ApiProperty({ example: 'my-org' })
    orgSlug!: string;
}

export class LoginBodyDto {
  @ApiProperty({ example: 'user@example.com' })
    email!: string;

  @ApiProperty({ example: 'password123' })
    password!: string;

  @ApiPropertyOptional({ example: 'my-org' })
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
