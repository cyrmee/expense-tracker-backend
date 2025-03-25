import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Swagger DTO for money source data
 */
@Exclude()
export class MoneySourceDto {
  @ApiProperty({
    description: 'Unique money source identifier',
    example: 'cash',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Name of the money source',
    example: 'Telebirr',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Current balance',
    example: 8380,
  })
  @Expose()
  balance: number;

  @ApiProperty({
    description: 'Balance in preferred currency',
    example: 250.75,
    required: false,
  })
  @Expose()
  balanceInPreferredCurrency?: number;

  @ApiProperty({
    description: 'Currency type',
    example: 'ETB',
  })
  @Expose()
  currency: string;

  @ApiProperty({
    description: 'Icon representing the money source',
    example: 'wallet',
  })
  @Expose()
  icon: string;

  @ApiProperty({
    description: 'If the money source is a default one',
    example: true,
  })
  @Expose()
  isDefault: boolean;

  @ApiProperty({
    description: 'Budget allocated for this money source',
    example: 500,
  })
  @Expose()
  budget: number;

  @ApiProperty({
    description: 'Budget in preferred currency',
    example: 15.25,
    required: false,
  })
  @Expose()
  budgetInPreferredCurrency?: number;

  @ApiProperty({
    description: 'Date when the money source was created',
    example: '2025-03-22T09:42:03.652Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the money source was last updated',
    example: '2025-03-22T09:42:03.652Z',
  })
  @Expose()
  updatedAt: Date;
}
