import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

@Exclude()
export class UpdateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Food & Dining',
  })
  @Expose()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  name?: string;

  @ApiProperty({
    description: 'Category icon',
    example: '🍕',
  })
  @Expose()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5)
  icon?: string;

  @ApiProperty({
    description: 'Category color in hex format',
    example: 'ffffff',
    default: 'ffffff',
  })
  @Expose()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  color: string = 'ffffff';
}
