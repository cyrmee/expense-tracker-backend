import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsNumber, IsNotEmpty, Min, IsOptional } from 'class-validator';

@Exclude()
export class CreateMonthlyBudgetDto {
  @ApiProperty({
    description: 'Budget amount',
    example: 500,
  })
  @Expose()
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Month (1-12)',
    example: 5,
    required: false,
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  month?: number;

  @ApiProperty({
    description: 'Year',
    example: 2025,
    required: false,
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  year?: number;
}
