import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateOrganizationBodyDto {
  @ApiProperty({ example: 'My New Org' })
  @IsString()
  @IsNotEmpty()
    name!: string;

  @ApiProperty({ example: 'my-new-org' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
    slug!: string;
}

export class SwitchOrganizationBodyDto {
  @ApiProperty({ example: 'my-org' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
    orgSlug!: string;
}

export class UserOrganizationDto {
  @ApiProperty()
    id!: string;

  @ApiProperty()
    name!: string;

  @ApiProperty()
    slug!: string;

  @ApiProperty()
    role!: string;
}

export class UserOrganizationsResponseDto {
  @ApiProperty({ type: [UserOrganizationDto] })
    organizations!: UserOrganizationDto[];
}
