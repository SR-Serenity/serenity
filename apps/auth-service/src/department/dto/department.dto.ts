import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateDepartmentBodyDto {
    @ApiProperty({ example: 'AI Team' })
    @IsString()
    @IsNotEmpty()
      name!: string;
}

export class UpdateDepartmentBodyDto {
    @ApiProperty({ example: 'AI Team' })
    @IsString()
    @IsNotEmpty()
      name!: string;
}

export class DepartmentResponseDto {
    @ApiProperty()
      id!: string;

    @ApiProperty()
      name!: string;

    @ApiProperty()
      orgId!: string;

    @ApiProperty()
      createdAt!: Date;
}

export class DepartmentWithMemberCountDto extends DepartmentResponseDto {
    @ApiProperty()
      memberCount!: number;
}

export class ListDepartmentsResponseDto {
    @ApiProperty({ type: [DepartmentWithMemberCountDto] })
      departments!: DepartmentWithMemberCountDto[];
}
