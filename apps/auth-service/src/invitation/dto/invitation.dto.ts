import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { WorkspaceRole, InvitationStatus } from '@prisma/client';

export class CreateInvitationBodyDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
      email!: string;

    @ApiProperty({
      enum: WorkspaceRole,
      enumName: 'WorkspaceRole',
      example: 'MEMBER',
    })
    @IsEnum(WorkspaceRole)
      role!: WorkspaceRole;

    @ApiPropertyOptional({ example: 'dept-uuid' })
    @IsOptional()
    @IsString()
      departmentId?: string;
}

export class AcceptInvitationBodyDto {
    @ApiProperty({ example: 'abc123token' })
    @IsString()
    @IsNotEmpty()
      token!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
      userId?: string;
}

export class JoinOrgWithInviteBodyDto {
    @ApiProperty({ example: 'abc123token' })
    @IsString()
    @IsNotEmpty()
      token!: string;
}

export class InvitationResponseDto {
    @ApiProperty()
      id!: string;

    @ApiProperty()
      email!: string;

    @ApiProperty({ enum: WorkspaceRole, enumName: 'WorkspaceRole' })
      role!: WorkspaceRole;

    @ApiPropertyOptional()
      departmentId!: string | null;

    @ApiPropertyOptional()
      departmentName!: string | null;

    @ApiProperty({ enum: InvitationStatus, enumName: 'InvitationStatus' })
      status!: InvitationStatus;

    @ApiProperty()
      inviterName!: string;

    @ApiProperty()
      orgName!: string;

    @ApiProperty()
      expiresAt!: Date;

    @ApiProperty()
      createdAt!: Date;
}

export class ListInvitationsResponseDto {
    @ApiProperty({ type: [InvitationResponseDto] })
      invitations!: InvitationResponseDto[];
}

export class AcceptInvitationNeedsRegistrationDto {
    @ApiProperty()
      needsRegistration!: true;

    @ApiProperty()
      email!: string;

    @ApiProperty()
      token!: string;

    @ApiProperty()
      orgName!: string;

    @ApiProperty({ enum: WorkspaceRole, enumName: 'WorkspaceRole' })
      role!: WorkspaceRole;

    @ApiPropertyOptional()
      departmentId!: string | null;

    @ApiPropertyOptional()
      departmentName!: string | null;
}

export class AcceptInvitationSuccessDto {
    @ApiProperty()
      accessToken!: string;

    @ApiProperty()
      tokenType!: string;

    @ApiProperty()
      user!: { id: string; email: string; displayName: string };

    @ApiProperty()
      organization!: { id: string; name: string; slug: string };
}

export class AcceptInvitationResponseDto {
    @ApiProperty()
      accessToken!: string;

    @ApiProperty()
      tokenType!: string;

    @ApiProperty()
      user!: {
        id: string;
        email: string;
        displayName: string;
    };

    @ApiProperty()
      organization!: {
        id: string;
        name: string;
        slug: string;
    };
}

export class JoinOrganizationResponseDto {
    @ApiProperty()
      accessToken!: string;

    @ApiProperty()
      tokenType!: string;

    @ApiProperty()
      user!: {
        id: string;
        email: string;
        displayName: string;
    };

    @ApiProperty()
      organization!: {
        slug: string;
    };
}
