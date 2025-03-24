import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsAlphanumeric,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Username (alphanumeric, min 3 characters)',
    example: 'johndoe123',
  })
  @IsString()
  @IsNotEmpty()
  @IsAlphanumeric()
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description:
      'Password (min 8 chars with uppercase, lowercase, and number/special char)',
    example: 'StrongP@ss123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain uppercase, lowercase, number/special character',
  })
  password: string;
}

export class RegisterPowerUsersDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Username (alphanumeric, min 3 characters)',
    example: 'johndoe123',
  })
  @IsString()
  @IsNotEmpty()
  @IsAlphanumeric()
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description:
      'Password (min 8 chars with uppercase, lowercase, and number/special char)',
    example: 'StrongP@ss123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain uppercase, lowercase, number/special character',
  })
  password: string;
}

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'StrongP@ss123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class TwoFactorAuthCodeDto {
  @ApiProperty({
    description: 'Two-factor authentication code (6+ characters)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  twoFactorCode: string;
}

export class TwoFactorAuthSetupDto {
  @ApiProperty({
    description: 'Two-factor authentication setup code (6+ characters)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  twoFactorCode: string;
}
