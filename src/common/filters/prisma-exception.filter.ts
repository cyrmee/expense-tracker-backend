import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces';
import { Prisma } from '../../generated/prisma/client';

/**
 * Global exception filter that catches all Prisma-specific errors
 * and translates them into appropriate HTTP responses.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Default error status and message
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database operation failed';
    let errorType = 'Database Error';
    let details: Record<string, any> | null = null;

    // Extract target field and error info
    const target = exception.meta?.target as string[] | undefined;
    const field = target && target.length > 0 ? target[0] : undefined;

    // Handle specific Prisma error codes
    switch (exception.code) {
      // Unique constraint violations
      case 'P2002':
        status = HttpStatus.CONFLICT;
        const fieldName = field || 'field';
        message = `A record with this ${fieldName} already exists`;
        errorType = 'Unique Constraint Violation';
        details = {
          field: fieldName,
          code: exception.code,
        };
        break;

      // Foreign key constraint violations
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Related record does not exist';
        errorType = 'Foreign Key Constraint Violation';
        details = {
          field: field,
          code: exception.code,
        };
        break;

      // Record not found (findUnique, etc.)
      case 'P2001':
      case 'P2018':
      case 'P2025': // Added to handle the common "Record not found" error
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        errorType = 'Not Found';
        details = { code: exception.code };
        break;

      // Required field constraint violations
      case 'P2004':
        status = HttpStatus.BAD_REQUEST;
        message = 'Required field missing';
        errorType = 'Constraint Violation';
        details = {
          field: field,
          code: exception.code,
        };
        break;

      // Required relation violation
      case 'P2011':
      case 'P2012': // Added for NOT NULL constraint
        status = HttpStatus.BAD_REQUEST;
        message = 'Required field missing';
        errorType = 'Null Constraint Violation';
        details = {
          field: exception.meta?.target,
          code: exception.code,
        };
        break;

      // Invalid data provided
      case 'P2005':
      case 'P2006':
      case 'P2007': // JSON parsing error
      case 'P2019': // Input validation error
      case 'P2020': // Value out of range
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid value provided';
        errorType = 'Invalid Input';
        details = {
          field: field,
          code: exception.code,
        };
        break;

      // Database connection errors
      case 'P1000':
      case 'P1001':
      case 'P1002':
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'Database connection error';
        errorType = 'Service Unavailable';
        details = {
          code: exception.code,
        };
        break;

      // Query engine errors
      case 'P2009':
      case 'P2010':
      case 'P2015':
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Database query error';
        errorType = 'Query Error';
        details = {
          code: exception.code,
        };
        break;

      // Default handling for other Prisma errors
      default:
        // Generic message for all other errors
        message = 'Database operation failed';
        details = {
          code: exception.code,
          clientVersion: exception.clientVersion,
        };
    }

    // Create standardized error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error: errorType,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Add additional debugging info in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      if (details) {
        details.prismaCode = exception.code;
        details.meta = exception.meta;
      }
    } else {
      // In production, hide internal error details for unknown errors
      if (
        !['P2002', 'P2003', 'P2001', 'P2018', 'P2025'].includes(exception.code)
      ) {
        errorResponse.details = null;
      }
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} ${status}: ${message} (${exception.code})`,
      exception.stack,
    );

    // Send the error response
    response.status(status).json(errorResponse);
  }
}
