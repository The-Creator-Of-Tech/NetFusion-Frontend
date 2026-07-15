export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    // Set prototype explicitly for old environments
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error or connection refused') {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class ValidationError extends ApiError {
  errors: Record<string, string[]>;

  constructor(message: string, status: number, errors: Record<string, string[]>, data?: any) {
    super(message, status, data);
    this.name = 'ValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}

export function isTimeoutError(error: any): error is TimeoutError {
  return error instanceof TimeoutError;
}

export function isNetworkError(error: any): error is NetworkError {
  return error instanceof NetworkError;
}

export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}
