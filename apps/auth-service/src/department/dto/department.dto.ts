import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateDepartmentRequestDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/\S/, { message: 'name must not contain only whitespace' })
      name!: string;
}

export class UpdateDepartmentRequestDto extends CreateDepartmentRequestDto {}
