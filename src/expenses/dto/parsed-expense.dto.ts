import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CategoryBaseDto } from '../../categories/dto';
import { MoneySourceBaseDto } from '../../money-sources/dto';

/**
 * DTO for parsed expense data from natural language input
 */
@Exclude()
export class ParsedExpenseDto {
  @ApiProperty({
    description: 'Amount of the expense',
    example: 320,
  })
  @Expose()
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Date of the expense',
    example: '2025-04-12T21:00:00.000Z',
  })
  @Expose()
  @IsDate()
  @IsNotEmpty()
  date: Date;

  @ApiProperty({
    description: 'Notes for the expense',
    example: 'Lunch at restaurant',
    required: false,
  })
  @Expose()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Category ID',
    example: 'food',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    description: 'Category of the expense',
    type: CategoryBaseDto,
  })
  @Expose()
  @Type(() => CategoryBaseDto)
  category: CategoryBaseDto;

  @ApiProperty({
    description: 'Money source of the expense',
    type: () => MoneySourceBaseDto, // Changed to lazy loading with arrow function
  })
  @Expose()
  @Type(() => MoneySourceBaseDto)
  moneySource: MoneySourceBaseDto;

  @ApiProperty({
    description: 'Money source ID',
    example: 'cash',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  moneySourceId: string;
}
