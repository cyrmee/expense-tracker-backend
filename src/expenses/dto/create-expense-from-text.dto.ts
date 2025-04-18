import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class CreateExpenseFromTextDto {
  @ApiProperty({
    description: 'Natural language text to extract expense data from',
    example: 'Choafan Rice with Chicken 320 cash',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Expose()
  text!: string;
}
