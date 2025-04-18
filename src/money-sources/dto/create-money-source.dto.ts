import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

@Exclude()
export class CreateMoneySourceDto {
  @ApiProperty({
    description: 'Name of the money source',
    example: 'Telebirr',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Initial balance',
    example: 8380,
  })
  @Expose()
  @IsNumber()
  @Min(0)
  balance: number;

  @ApiProperty({
    description: 'Currency type',
    example: 'ETB',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'Icon representing the money source',
    example: 'wallet',
    required: false,
  })
  @Expose()
  @IsString()
  @IsOptional()
  icon: string;

  @ApiProperty({
    description: 'If the money source is a default one',
    example: false,
    default: false,
  })
  @Expose()
  @IsBoolean()
  @IsOptional()
  isDefault: boolean = false;

  @ApiProperty({
    description: 'Budget allocated for this money source',
    example: 500,
    required: false,
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  budget: number;
}
