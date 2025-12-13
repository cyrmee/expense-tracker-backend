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
 * Global exception filter that catches unknown and unexpected Prisma errors
 * and provides a generic database error message to the client.
 */
@Catch(
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientValidationError,
)
export class PrismaUnknownExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaUnknownExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientUnknownRequestError
      | Prisma.PrismaClientRustPanicError
      | Prisma.PrismaClientInitializationError
      | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine appropriate status code based on error type
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorType = 'Database Error';

    // Validation errors should be 400 Bad Request
    if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      errorType = 'Invalid Request';
    }

    // Initialization errors might indicate service unavailability
    if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      errorType = 'Service Unavailable';
    }

    // Create generic error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: 'Database operation failed',
      error: errorType,
      timestamp: new Date().toISOString(),
      path: request.url,
      details: null,
    };

    // Add detailed error info for development environments only
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.details = {
        errorName: exception.name,
        errorMessage: exception.message,
      };

      // Add clientVersion for specific error types
      if (
        exception instanceof Prisma.PrismaClientUnknownRequestError ||
        exception instanceof Prisma.PrismaClientRustPanicError ||
        exception instanceof Prisma.PrismaClientInitializationError
      ) {
        errorResponse.details.clientVersion = exception.clientVersion;
      }
    }

    // Log the error with stack trace for debugging
    this.logger.error(
      `${request.method} ${request.url} ${status}: Database operation failed (${exception.name})`,
      exception.stack,
    );

    // Send the error response
    response.status(status).json(errorResponse);
  }
}
