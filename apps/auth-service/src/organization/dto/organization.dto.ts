import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateOrganizationRequestDto {
  @IsString()
  @IsNotEmpty()
    name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
    slug!: string;
}

export class SwitchOrganizationRequestDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
    orgSlug!: string;
}
