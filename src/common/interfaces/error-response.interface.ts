/**
 * Interface for standardized error responses across the application
 */
export interface ErrorResponse {
  /**
   * HTTP status code
   */
  statusCode: number;

  /**
   * Error message
   */
  message: string;

  /**
   * Error type or code
   */
  error: string;

  /**
   * Optional additional details about the error
   */
  details?: Record<string, any> | null;

  /**
   * Timestamp when the error occurred
   */
  timestamp: string;

  /**
   * Request path that caused the error
   */
  path: string;
}
