import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { Expose } from 'class-transformer';

/**
 * DeleteExpensesDto is a Data Transfer Object (DTO) used for bulk deleting expenses.
 * It includes an array of expense IDs to be deleted.
 */
export class DeleteExpensesDto {
  @ApiProperty({
    description: 'Array of expense IDs to delete',
    example: ['4a409730-2574-4cd2-b7d1-feb20d1f3e4e', '5b519840-3685-5de3-c8e2-gfc31e2g4f5f'],
    type: [String],
  })  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("all", { each: true })
  @Expose()
  ids: string[];
}
