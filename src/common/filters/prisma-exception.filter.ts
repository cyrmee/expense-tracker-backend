import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ErrorResponse } from '../interfaces';

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
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid value provided';
        errorType = 'Invalid Input';
        details = {
          field: field,
          code: exception.code,
        };
        break;

      // Default handling for other Prisma errors
      default:
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
