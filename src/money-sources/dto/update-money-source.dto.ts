import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

@Exclude()
export class UpdateMoneySourceDto {
  @ApiProperty({
    description: 'Name of the money source',
    example: 'Telebirr',
    required: false,
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Initial balance',
    example: 8380,
    required: false,
  })
  @Expose()
  @IsNumber()
  @Min(0)
  @IsOptional()
  balance?: number;

  @ApiProperty({
    description: 'Currency type',
    example: 'ETB',
    required: false,
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    description: 'Icon representing the money source',
    example: 'wallet',
    required: false,
  })
  @Expose()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({
    description: 'If the money source is a default one',
    example: false,
    required: false,
  })
  @Expose()
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({
    description: 'Budget allocated for this money source',
    example: 500,
    required: false,
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  budget?: number;

  @ApiProperty({
    description: 'Card style ID for the money source appearance',
    example: 'modern-gradient',
    required: false,
  })
  @Expose()
  @IsUUID()
  @IsOptional()
  cardStyleId?: string;
}
