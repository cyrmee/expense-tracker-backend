import { ApiProperty } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

/**
 * Generic Paginated Result DTO for returning paginated data
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Array of data items', isArray: true })
  data: T[];

  @ApiProperty({ description: 'Indicates if there are more pages available', example: true })
  hasMore: boolean;

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
