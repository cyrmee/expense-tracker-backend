import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces';

/**
 * Global HTTP exception filter that ensures consistent error responses
 * for all REST API endpoints in the application.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Get status code from the exception
    const status = exception.getStatus();

    // Get detailed error information from exception
    const errorResponse = exception.getResponse() as any;

    // Prepare standardized error response format
    const errorObject: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: this.getErrorMessage(exception, errorResponse),
      error: this.getErrorType(status, errorResponse),
      details: this.getErrorDetails(errorResponse),
    };

    // Log error (but don't log 401/403 errors to avoid log pollution)
    if (status !== HttpStatus.UNAUTHORIZED && status !== HttpStatus.FORBIDDEN) {
      this.logger.error(
        `${request.method} ${request.url} ${status}: ${errorObject.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Send response with appropriate status code and format
    response.status(status).json(errorObject);
  }

  /**
   * Extract appropriate error message from the exception
   */
  private getErrorMessage(
    exception: HttpException,
    errorResponse: any,
  ): string {
    // If errorResponse has a message property, use it
    if (
      errorResponse &&
      typeof errorResponse === 'object' &&
      'message' in errorResponse
    ) {
      // Handle validation error arrays (from class-validator)
      if (Array.isArray(errorResponse.message)) {
        return errorResponse.message[0] || exception.message;
      }
      return errorResponse.message;
    }

    // If errorResponse is a string, use it
    if (typeof errorResponse === 'string') {
      return errorResponse;
    }

    // Fallback to the exception message
    return exception.message;
  }

  /**
   * Extract or determine the error type based on HTTP status
   */
  private getErrorType(status: number, errorResponse: any): string {
    // If there's an error property in the response, use it
    if (
      errorResponse &&
      typeof errorResponse === 'object' &&
      'error' in errorResponse
    ) {
      return errorResponse.error;
    }

    // Otherwise map HTTP status to an error type
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'Validation Error';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Too Many Requests';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      default:
        return `HTTP Error ${status}`;
    }
  }

  /**
   * Extract additional error details if available
   */
  private getErrorDetails(errorResponse: any): Record<string, any> | null {
    // If errorResponse is an object with properties other than message and error, include them
    if (errorResponse && typeof errorResponse === 'object') {
      // Extract validation error details from class-validator
      if (Array.isArray(errorResponse.message)) {
        return { validation: errorResponse.message };
      }

      // For other types, include any additional properties as details
      const { message, error, ...details } = errorResponse;
      if (Object.keys(details).length) {
        return details;
      }
    }

    return null;
  }
}
