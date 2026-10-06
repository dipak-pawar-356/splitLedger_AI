export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
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
  constructor(message: string) {
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
    // Handle specific error types
    if (error.message.includes('unique constraint') || error.message.includes('duplicate')) {
      return new ConflictError(error.message);
    }
    if (error.message.includes('foreign key')) {
      return new ValidationError('Invalid reference to related data');
    }
    if (error.message.includes('not found')) {
      return new NotFoundError();
    }
    
    return new ServerError(error.message, { originalError: error.message });
  }

  return new ServerError('An unexpected error occurred');
}

export function getErrorMessage(error: unknown): string {
  const appError = handleError(error);
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
