import { ApiProperty } from '@nestjs/swagger';

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

export class UserProfileResponseDto {
  @ApiProperty()
    id!: string;

  @ApiProperty()
    email!: string;

  @ApiProperty()
    displayName!: string;

  @ApiProperty({ format: 'date-time' })
    createdAt!: Date;

  @ApiProperty({ type: [UserOrganizationDto] })
    organizations!: UserOrganizationDto[];
}

export class UserResponseDto {
  @ApiProperty()
    id!: string;

  @ApiProperty()
    email!: string;

  @ApiProperty()
    displayName!: string;

  @ApiProperty({ format: 'date-time' })
    createdAt!: Date;
}
