import {
    IsEmail,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
export class RegisterDto {
    @IsString()
    @MinLength(3)
    @MaxLength(30)
    username: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;
}

export class LoginDto {
    @IsEmail()
    email: string;

    @IsString()
    password: string;
}

export class AddContactDto {
    @IsEmail()
    contactEmail: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    displayName?: string;
}

export class UpdateContactDto {
    @IsOptional()
    @IsString()
    @MaxLength(50)
    displayName?: string;
}

export class UpdateProfilePhotoDto {
    @IsString()
    @MinLength(3)
    avatarUrl: string;
}

export class UpdatePublicKeyDto {
    @IsString()
    @MinLength(32)
    publicKey: string;
}
