import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError, ZodSchema } from 'zod';
import { logger } from './logger.js';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

/**
 * Zod validation helper that validates data and throws a structured BadRequestError on failure.
 */
export function validateWithZod<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const formatted = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message
    }));
    throw new BadRequestError('Validation failed', formatted);
  }
  return result.data;
}

/**
 * Central Fastify Error Handler conforming to one unified JSON shape:
 * { "error": { "code": string, "message": string, "details"?: unknown } }
 */
export function errorHandler(
  error: FastifyError | AppError | Error,
  _request: FastifyRequest,
  reply: FastifyReply
): void {
  // 1. Handled AppError
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {})
      }
    });
    return;
  }

  // 2. Direct ZodError
  if (error instanceof ZodError) {
    const details = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message
    }));
    reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details
      }
    });
    return;
  }

  // 3. Fastify built-in rate limit / validation / 404 error
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    const statusCode = error.statusCode;
    const code = error.code || (statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' : 'REQUEST_ERROR');
    reply.status(statusCode).send({
      error: {
        code,
        message: error.message
      }
    });
    return;
  }

  // 4. Uncaught Internal Server Error
  logger.error({ err: error }, 'Unhandled server error');
  reply.status(500).send({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred'
    }
  });
}
