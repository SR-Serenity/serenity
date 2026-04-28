import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationBodyDto {
  @ApiProperty({ example: 'My New Org' })
    name!: string;

  @ApiProperty({ example: 'my-new-org' })
    slug!: string;
}

export class SwitchOrganizationBodyDto {
  @ApiProperty({ example: 'my-org' })
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
