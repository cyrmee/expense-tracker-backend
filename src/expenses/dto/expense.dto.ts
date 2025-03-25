import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Swagger DTO for expense data
 */
@Exclude()
export class ExpenseDto {
  @ApiProperty({
    description: 'Unique expense identifier',
    example: '4a409730-2574-4cd2-b7d1-feb20d1f3e4e',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Amount of the expense',
    example: 320,
  })
  @Expose()
  amount: number;

  @ApiProperty({
    description: 'Amount in preferred currency',
    example: 9.75,
    required: false,
  })
  @Expose()
  amountInPreferredCurrency?: number;

  @ApiProperty({
    description: 'Date of the expense',
    example: '2025-03-20T21:00:00.000Z',
  })
  @Expose()
  date: Date;

  @ApiProperty({
    description: 'Notes for the expense',
    example: 'Choafan Rice with Chicken',
    required: false,
  })
  @Expose()
  notes?: string;

  @ApiProperty({
    description: 'ID of the related category',
    example: 'food',
  })
  @Expose()
  categoryId: string;

  @ApiProperty({
    description: 'ID of the related money source',
    example: 'cash',
  })
  @Expose()
  moneySourceId: string;

  @ApiProperty({
    description: 'ID of the user who created the expense',
    example: 'b6e11e23-d43d-4a0d-a9d3-08e94d7a032b',
  })
  @Expose()
  userId: string;

  @ApiProperty({
    description: 'Date when the expense was created',
    example: '2025-03-20T21:05:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the expense was last updated',
    example: '2025-03-20T21:10:00.000Z',
  })
  @Expose()
  updatedAt: Date;
}
