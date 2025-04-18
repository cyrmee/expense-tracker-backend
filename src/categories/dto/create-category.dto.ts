import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

@Exclude()
export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Food & Dining',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  name: string;

  @ApiProperty({
    description: 'Category icon',
    example: '🍕',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5)
  icon: string;

  @ApiProperty({
    description: 'Category color in hex format',
    example: 'ffffff',
    default: 'ffffff',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  color: string = 'ffffff';
}
