import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { SortOrder } from '../dto/paginated-request.dto';

export function ApiPaginationQuery() {
  return applyDecorators(
    // Basic pagination
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (starts from 1)',
      example: 1,
    }),
    ApiQuery({
      name: 'pageSize',
      required: false,
      type: Number,
      description: 'Number of items per page',
      example: 10,
    }),

    // Searching & Sorting
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description: 'Search term for filtering records',
    }),
    ApiQuery({
      name: 'sortBy',
      required: false,
      type: String,
      description: 'Field to sort by',
      example: 'date',
    }),
    ApiQuery({
      name: 'sortOrder',
      required: false,
      enum: SortOrder,
      description: 'Sort direction (asc or desc)',
      example: 'desc',
    }),

    // Basic filtering
    ApiQuery({
      name: 'filterField',
      required: false,
      type: String,
      description: 'Field to filter by',
      example: 'categoryId',
    }),
    ApiQuery({
      name: 'filterValue',
      required: false,
      type: String,
      description: 'Value to filter with',
      example: '1234-5678-90ab',
    }),

    // Range filtering
    ApiQuery({
      name: 'rangeField',
      required: false,
      type: String,
      description: 'Field to apply range filter to',
      example: 'amount',
    }),
    ApiQuery({
      name: 'minValue',
      required: false,
      type: Number,
      description: 'Minimum value for range filter',
      example: 10,
    }),
    ApiQuery({
      name: 'maxValue',
      required: false,
      type: Number,
      description: 'Maximum value for range filter',
      example: 100,
    }),

    // Multi-value filtering
    ApiQuery({
      name: 'multiValueField',
      required: false,
      type: String,
      description: 'Field to filter with multiple values',
      example: 'categoryId',
    }),
    ApiQuery({
      name: 'multiValues',
      required: false,
      type: [String],
      isArray: true,
      description: 'Array of values to include in filter',
      example: ['id1', 'id2', 'id3'],
    }),

    // Date range filtering
    ApiQuery({
      name: 'dateField',
      required: false,
      type: String,
      description: 'Date field to filter by range',
      example: 'date',
    }),
    ApiQuery({
      name: 'startDate',
      required: false,
      type: String,
      description: 'Start date for range filter (ISO format)',
      example: '2023-01-01',
    }),
    ApiQuery({
      name: 'endDate',
      required: false,
      type: String,
      description: 'End date for range filter (ISO format)',
      example: '2023-12-31',
    }),
  );
}
