import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class UserDataDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class ExportDataResponseDto {
  @ApiProperty({
    description: 'User data (email and name only)',
    type: UserDataDto,
  })
  user: UserDataDto;

  @ApiProperty({
    description: 'User expenses',
    type: 'array',
    isArray: true,
  })
  expenses: any[];

  @ApiProperty({
    description: 'User categories',
    type: 'array',
    isArray: true,
  })
  categories: any[];

  @ApiProperty({
    description: 'User money sources',
    type: 'array',
    isArray: true,
  })
  moneySources: any[];

  @ApiProperty({
    description: 'User balance histories',
    type: 'array',
    isArray: true,
  })
  balanceHistories: any[];

  @ApiProperty({
    description: 'User app settings',
    type: Object,
  })
  appSettings: any;
}

export class ImportDataDto {
  @ApiProperty({
    description: 'User data (email and name only)',
    type: UserDataDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => UserDataDto)
  @IsOptional()
  user?: UserDataDto;

  @ApiProperty({
    description: 'User expenses',
    type: 'array',
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  expenses?: any[];

  @ApiProperty({
    description: 'User categories',
    type: 'array',
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  categories?: any[];

  @ApiProperty({
    description: 'User money sources',
    type: 'array',
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  moneySources?: any[];

  @ApiProperty({
    description: 'User balance histories',
    type: 'array',
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  balanceHistories?: any[];

  @ApiProperty({
    description: 'User app settings',
    type: Object,
  })
  @IsObject()
  @IsOptional()
  appSettings?: any;
}
