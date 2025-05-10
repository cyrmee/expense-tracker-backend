import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { BalanceHistoryBaseDto } from '../../balance-history/dto';
import { ExpenseBaseDto } from '../../expenses/dto';
import { CardStyleDto } from './card-style.dto';

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
    description: 'Card style ID for the money source appearance',
    example: 'modern-gradient',
    required: false,
  })
  @Expose()
  cardStyleId?: string;

  @ApiProperty({
    description: 'Card style details',
    type: () => CardStyleDto,
    required: false,
  })
  @Expose()
  @Type(() => CardStyleDto)
  cardStyle?: CardStyleDto;

  @ApiProperty({
    description: 'Budget in preferred currency',
    example: 15.25,
    required: false,
  })
  @Expose()
  budgetInPreferredCurrency?: number;

  @ApiProperty({
    description: 'List of expenses associated with this money source',
    type: () => ExpenseBaseDto, // Changed to lazy loading with arrow function
    isArray: true,
    required: false,
  })
  @Expose()
  @Type(() => ExpenseBaseDto)
  expenses?: ExpenseBaseDto[];

  @ApiProperty({
    description: 'List of balance histories associated with this money source',
    type: () => BalanceHistoryBaseDto, // Changed to lazy loading with arrow function
    isArray: true,
    required: false,
  })
  @Expose()
  @Type(() => BalanceHistoryBaseDto)
  balanceHistories?: BalanceHistoryBaseDto[];

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
