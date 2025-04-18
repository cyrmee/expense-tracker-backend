import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class PaginatedRequestDto<T = any> {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'Page number must be at least 1' })
  page: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'Page size must be at least 1' })
  @Max(100, { message: 'Page size cannot exceed 100' })
  pageSize: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: keyof T;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsString()
  filterField?: keyof T;

  @IsOptional()
  @IsString()
  filterValue?: string;

  @IsOptional()
  @IsString()
  rangeField?: keyof T;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minValue?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxValue?: number;

  @IsOptional()
  @IsString()
  multiValueField?: keyof T;

  @IsOptional()
  @Type(() => Array)
  multiValues?: string[];

  @IsOptional()
  @IsString()
  dateField?: keyof T;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

// Helper class for building query conditions
export class QueryBuilder {
  static buildWhereCondition<T>(
    paginationDto: PaginatedRequestDto<T>,
    userId?: string,
  ): any {
    const { filterField, filterValue } = paginationDto;
    let whereConditions: any = {};

    // Add userId condition if provided
    if (userId) {
      whereConditions.userId = userId;
    }

    // Add basic filter condition if provided (equality)
    if (filterField && filterValue !== undefined) {
      whereConditions[filterField as string] = filterValue;
    }

    // Add range filters (for numbers and amounts)
    if (
      paginationDto['rangeField'] &&
      (paginationDto['minValue'] !== undefined ||
        paginationDto['maxValue'] !== undefined)
    ) {
      const field = paginationDto['rangeField'] as string;
      whereConditions[field] = {};

      if (paginationDto['minValue'] !== undefined) {
        whereConditions[field].gte = paginationDto['minValue'];
      }

      if (paginationDto['maxValue'] !== undefined) {
        whereConditions[field].lte = paginationDto['maxValue'];
      }
    }

    // Add multi-value filters (for categories, tags, etc.)
    if (
      paginationDto['multiValueField'] &&
      Array.isArray(paginationDto['multiValues']) &&
      paginationDto['multiValues'].length > 0
    ) {
      const field = paginationDto['multiValueField'] as string;
      whereConditions[field] = { in: paginationDto['multiValues'] };
    }

    // Add date range filters
    if (
      paginationDto['dateField'] &&
      (paginationDto['startDate'] || paginationDto['endDate'])
    ) {
      const field = paginationDto['dateField'] as string;
      whereConditions[field] = {};

      if (paginationDto['startDate']) {
        whereConditions[field].gte = new Date(paginationDto['startDate']);
      }

      if (paginationDto['endDate']) {
        whereConditions[field].lte = new Date(paginationDto['endDate']);
      }
    }

    return whereConditions;
  }
}
