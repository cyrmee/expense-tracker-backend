import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CategoryBaseDto {
  @ApiProperty({
    description: 'Unique category identifier',
    example: 'food',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Food & Dining',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Category icon',
    example: '🍕',
  })
  @Expose()
  icon: string;

  @ApiProperty({
    description: 'Indicates if the category is a system default',
    example: true,
  })
  @Expose()
  isDefault: boolean;

  @ApiProperty({
    description: 'ID of the user who created this category (if user-specific)',
    example: 'b6e11e23-d43d-4a0d-a9d3-08e94d7a032b',
    nullable: true,
  })
  @Expose()
  userId?: string;

  @ApiProperty({
    description: 'Date when the category was created',
    example: '2025-03-20T21:05:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the category was last updated',
    example: '2025-03-20T21:10:00.000Z',
  })
  @Expose()
  updatedAt: Date;
}
