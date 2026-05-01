import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateMemberRoleBodyDto {
  @ApiProperty({ enum: WorkspaceRole, enumName: 'WorkspaceRole' })
  @IsEnum(WorkspaceRole)
    role!: WorkspaceRole;
}

export class UpdateMemberDepartmentBodyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
    departmentId?: string;
}
