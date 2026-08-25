import { WorkspaceRole } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateInvitationRequestDto {
    @IsEmail()
      email!: string;

    @IsEnum(WorkspaceRole)
      role!: WorkspaceRole;

    @IsOptional()
    @IsString()
      departmentId?: string;
}

export class AcceptInvitationRequestDto {
    @IsString()
    @IsNotEmpty()
      token!: string;
}
