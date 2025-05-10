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
    }),
    ApiQuery({
      name: 'pageSize',
      required: false,
      type: Number,
      description: 'Number of items per page',
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
    }),
    ApiQuery({
      name: 'sortOrder',
      required: false,
      enum: SortOrder,
      description: 'Sort direction (asc or desc)',
    }),

    // Basic filtering
    ApiQuery({
      name: 'filterField',
      required: false,
      type: String,
      description: 'Field to filter by',
    }),
    ApiQuery({
      name: 'filterValue',
      required: false,
      type: String,
      description: 'Value to filter with',
    }),

    // Range filtering
    ApiQuery({
      name: 'rangeField',
      required: false,
      type: String,
      description: 'Field to apply range filter to',
    }),
    ApiQuery({
      name: 'minValue',
      required: false,
      type: Number,
      description: 'Minimum value for range filter',
    }),
    ApiQuery({
      name: 'maxValue',
      required: false,
      type: Number,
      description: 'Maximum value for range filter',
    }),

    // Multi-value filtering
    ApiQuery({
      name: 'multiValueField',
      required: false,
      type: String,
      description: 'Field to filter with multiple values',
    }),
    ApiQuery({
      name: 'multiValues',
      required: false,
      type: [String],
      isArray: true,
      description: 'Array of values to include in filter',
    }),

    // Date range filtering
    ApiQuery({
      name: 'dateField',
      required: false,
      type: String,
      description: 'Date field to filter by range',
    }),
    ApiQuery({
      name: 'startDate',
      required: false,
      type: String,
      description: 'Start date for range filter (ISO format)',
    }),
    ApiQuery({
      name: 'endDate',
      required: false,
      type: String,
      description: 'End date for range filter (ISO format)',
    }),
  );
}
