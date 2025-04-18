import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CategoryComparisonDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Transportation',
  })
  @Expose()
  categoryName: string;

  @ApiProperty({
    description: 'User spending amount in this category',
    example: 120.5,
  })
  @Expose()
  userAmount: number;

  @ApiProperty({
    description: 'Average spending amount by other users',
    example: 141.75,
  })
  @Expose()
  averageAmount: number;

  @ApiProperty({
    description: 'Percentage difference (negative means user spends less)',
    example: -15.0,
  })
  @Expose()
  percentageDifference: number;

  @ApiProperty({
    description: 'Currency for all amounts',
    example: 'ETB',
  })
  @Expose()
  currency: string;
}
