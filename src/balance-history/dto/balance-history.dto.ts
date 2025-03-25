import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * Data Transfer Object for balance history records
 */
@Exclude()
export class BalanceHistoryDto {
  @ApiProperty({
    description: 'Unique balance history identifier',
    example: 'a1b2c3d4-e5f6-7g8h-9i10-jk11lm12no13',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Date when the balance snapshot was recorded',
    example: '2025-03-22T09:37:09.266Z',
  })
  @Expose()
  date: Date;

  @ApiProperty({
    description: 'Balance amount at the recorded time',
    example: 5000,
  })
  @Expose()
  balance: number;

  @ApiProperty({
    description: 'Currency type of the balance',
    example: 'ETB',
  })
  @Expose()
  currency: string;

  @ApiProperty({
    description: 'ID of the related money source',
    example: 'bank',
  })
  @Expose()
  moneySourceId: string;

  @ApiProperty({
    description: 'ID of the user associated with this record',
    example: 'b6e11e23-d43d-4a0d-a9d3-08e94d7a032b',
    nullable: true,
  })
  @Expose()
  userId?: string;

  @ApiProperty({
    description: 'Date when this record was created',
    example: '2025-03-22T09:37:09.266Z',
  })
  @Expose()
  createdAt: Date;
}
