import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class MonthlyBudgetDto {
  @ApiProperty({
    description: 'Unique ID for the monthly budget',
    example: 'c8e7f3a1-b7f9-4b5e-8a0d-3f5e9c7b8a0d',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Budget amount',
    example: 500,
  })
  @Expose()
  amount: number;

  @ApiProperty({
    description: 'Month (1-12)',
    example: 5,
  })
  @Expose()
  month: number;

  @ApiProperty({
    description: 'Year',
    example: 2025,
  })
  @Expose()
  year: number;

  @ApiProperty({
    description: 'Money source ID',
    example: 'cash',
  })
  @Expose()
  moneySourceId: string;

  @ApiProperty({
    description: 'Date when the budget was created',
    example: '2025-03-22T09:42:03.652Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the budget was last updated',
    example: '2025-03-22T09:42:03.652Z',
  })
  @Expose()
  updatedAt: Date;
}
