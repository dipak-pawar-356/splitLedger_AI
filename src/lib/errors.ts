/**
 * Enterprise Application Error Handling & Defensive Error Masking Engine
 * 
 * Ensures production responses never leak:
 * - Stack traces
 * - SQL / Database syntax & constraint errors
 * - File system paths
 * - Internal server configuration & secrets
 */
import crypto from "crypto";

export class AppError extends Error {
  public correlationId: string;

  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.correlationId = `err_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export const ForbiddenError = AuthorizationError;
export type ForbiddenError = AuthorizationError;

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict detected') {
    super(message, 'CONFLICT_ERROR', 409);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, 'DATABASE_ERROR', 500, details);
    this.name = 'DatabaseError';
  }
}

export class ServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(message, 'SERVER_ERROR', 500, details);
    this.name = 'ServerError';
  }
}

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    const rawMsg = error.message.toLowerCase();
    // Handle specific database constraint error types safely
    if (rawMsg.includes('unique constraint') || rawMsg.includes('duplicate')) {
      return new ConflictError('A record with these details already exists.');
    }
    if (rawMsg.includes('foreign key')) {
      return new ValidationError('Invalid reference to related data.');
    }
    if (rawMsg.includes('not found')) {
      return new NotFoundError();
    }
    
    // Log detailed internal error securely on server
    console.error(`[SERVER_EXCEPTION] [${new Date().toISOString()}]:`, error);
    return new ServerError('An unexpected server error occurred.', { originalError: error.message });
  }

  return new ServerError('An unexpected error occurred.');
}

/**
 * Return safe, user-friendly error message for production presentation
 */
export function getErrorMessage(error: unknown): string {
  const isProd = process.env.NODE_ENV === "production";
  const appError = handleError(error);

  if (isProd) {
    // Only safe client-facing errors keep their exact message
    if (
      appError instanceof ValidationError ||
      appError instanceof AuthenticationError ||
      appError instanceof AuthorizationError ||
      appError instanceof NotFoundError ||
      appError instanceof ConflictError
    ) {
      return appError.message;
    }
    // Database and internal server errors are strictly masked
    return 'An unexpected error occurred. Please try again later.';
  }

  return appError.message;
}

export function getErrorCode(error: unknown): string {
  const appError = handleError(error);
  return appError.code;
}

export function getErrorStatusCode(error: unknown): number {
  const appError = handleError(error);
  return appError.statusCode;
}

/**
 * Return production-safe JSON response payload for API route handlers
 */
export function maskErrorForClient(error: unknown): {
  success: false;
  error: string;
  code: string;
  statusCode: number;
  correlationId?: string;
} {
  const appError = handleError(error);
  const safeMessage = getErrorMessage(appError);

  return {
    success: false,
    error: safeMessage,
    code: appError.code,
    statusCode: appError.statusCode,
    ...(process.env.NODE_ENV === "production" ? { correlationId: appError.correlationId } : {}),
  };
}
