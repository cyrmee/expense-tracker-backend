import { ApiProperty } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

/**
 * Generic Paginated Result DTO for returning paginated data
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Array of data items', isArray: true })
  data: T[];

  @ApiProperty({
    description: 'Total count of items across all pages',
    example: 100,
  })
  totalCount: number;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  totalPages: number;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  pageSize: number;

  @ApiProperty({ description: 'Current page number (1-based)', example: 1 })
  page: number;
}

/**
 * Helper function for Swagger documentation to specify the type of data in the array
 * Usage example: @ApiResponse({ type: PaginatedResponseType(YourDto) })
 */
export function PaginatedResponseType<T extends Type<any>>(itemType: T) {
  class PaginatedResponseClass extends PaginatedResponseDto<T> {
    @ApiProperty({ type: itemType, isArray: true })
    declare data: T[];
  }

  // Set the class name for Swagger
  Object.defineProperty(PaginatedResponseClass, 'name', {
    value: `Paginated${itemType.name}Response`,
  });

  return PaginatedResponseClass;
}
