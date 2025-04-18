import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * CreateExpenseDto is a Data Transfer Object (DTO) used for creating a new expense.
 * It includes properties for amount, date, notes, category ID, and money source ID.
 */
export class CreateExpenseDto {
  @ApiProperty({
    description: 'Amount of the expense',
    example: 320,
  })
  @Expose()
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Date of the expense',
    example: '2025-03-20T21:00:00.000Z',
  })
  @Expose()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  date: Date;

  @ApiProperty({
    description: 'Notes for the expense',
    example: 'Choafan Rice with Chicken',
    required: false,
  })
  @Expose()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Category id of the expense',
    example: '4a409730-2574-4cd2-b7d1-feb20d1f3e4e',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    description: 'Money source id of the expense',
    example: '4a409730-2574-4cd2-b7d1-feb20d1f3e4e',
    type: String,
  })
  @IsUUID()
  @IsNotEmpty()
  moneySourceId: string;
}
