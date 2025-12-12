import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

/**
 * Global error handler middleware
 *
 * Catches all errors and returns standardized error responses.
 *
 * Error Types:
 * - ValidationError: 400 Bad Request
 * - AuthenticationError: 401 Unauthorized
 * - NotFoundError: 404 Not Found
 * - SteamAPIError: 503 Service Unavailable (when Steam API is down)
 * - Unknown errors: 500 Internal Server Error
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  logger.error(err);

  const status = (err as { status?: number }).status || 500;
  const message = (err as Error).message || 'Internal server error';

  // Log detailed error info
  if (status >= 500) {
    console.error('[ErrorHandler] Server error (500+):', {
      message,
      status,
      stack: (err as Error).stack
    });
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      details: (err as Error).stack
    })
  });
}
