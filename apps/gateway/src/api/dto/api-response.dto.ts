import { ApiProperty } from '@nestjs/swagger';

export class OrganizationResponseDto {
  @ApiProperty()
    id!: string;

  @ApiProperty()
    name!: string;

  @ApiProperty()
    slug!: string;

  @ApiProperty({ format: 'date-time' })
    createdAt!: Date;

  @ApiProperty()
    memberCount!: number;
}

export class OrganizationMemberDto {
  @ApiProperty()
    id!: string;

  @ApiProperty()
    email!: string;

  @ApiProperty()
    displayName!: string;

  @ApiProperty()
    role!: string;

  @ApiProperty({ format: 'date-time' })
    joinedAt!: Date;
}

export class OrganizationMembersResponseDto {
  @ApiProperty({ type: [OrganizationMemberDto] })
    members!: OrganizationMemberDto[];
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
