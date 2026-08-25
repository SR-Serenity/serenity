import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterUserRequestDto {
  @IsEmail()
    email!: string;

  @IsString()
  @MinLength(8)
    password!: string;

  @IsString()
  @IsNotEmpty()
    displayName!: string;
}

export class RegisterRequestDto extends RegisterUserRequestDto {
  @IsString()
  @IsNotEmpty()
    orgName!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
    orgSlug!: string;
}

export class RegisterWithInvitationRequestDto extends RegisterUserRequestDto {
  @IsString()
  @IsNotEmpty()
    inviteToken!: string;
}

export class LoginRequestDto {
  @IsEmail()
    email!: string;

  @IsString()
  @IsNotEmpty()
    password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
    orgSlug?: string;
}
