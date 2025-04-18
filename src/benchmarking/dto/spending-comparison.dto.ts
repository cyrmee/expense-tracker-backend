import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { CategoryComparisonDto } from './category-comparison.dto';

@Exclude()
export class SpendingComparisonDto {
  @ApiProperty({
    description: 'List of insights generated from the comparison',
    example: ['You spend 15% less on transportation than other users.'],
  })
  @Expose()
  insights: string[];

  @ApiProperty({
    description: 'Category-by-category spending comparison',
    type: [CategoryComparisonDto],
  })
  @Expose()
  categoryComparisons: CategoryComparisonDto[];

  @ApiProperty({
    description: 'Overall monthly spending compared to average',
    example: -8.5,
  })
  @Expose()
  overallDifferencePercentage: number;

  @ApiProperty({
    description: 'Number of users in the comparison group',
    example: 42,
  })
  @Expose()
  comparisonUserCount: number;

  @ApiProperty({
    description: 'User total monthly spending',
    example: 1450.75,
  })
  @Expose()
  userMonthlySpending: number;

  @ApiProperty({
    description: 'Average monthly spending across comparison users',
    example: 1586.5,
  })
  @Expose()
  averageMonthlySpending: number;

  @ApiProperty({
    description: 'Currency for all monetary values',
    example: 'ETB',
  })
  @Expose()
  currency: string;
}
