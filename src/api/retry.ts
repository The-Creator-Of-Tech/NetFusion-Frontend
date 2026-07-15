/**
 * src/api/retry.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Retry strategy helpers.
 *
 * Retryable: Network errors, Timeout, 502, 503, 504
 * Non-retryable: 400, 401, 403, 404, 409, 422
 */

import { NetworkError, TimeoutError, ApiError } from './errors';

/** HTTP status codes that should be retried (transient failures). */
export const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

/** HTTP status codes that must NOT be retried. */
export const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 403, 404, 409, 422]);

/**
 * Returns true if the error is transient and worth retrying.
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof TimeoutError) return true;
  if (error instanceof ApiError) {
    return RETRYABLE_STATUS_CODES.has(error.status);
  }
  return false;
}

/**
 * Exponential backoff delay in ms.
 * attempt=1 → initialDelay, attempt=2 → 2x, attempt=3 → 4x, etc.
 * Capped at maxDelay (default 10s).
 */
export function backoffDelay(
  attempt: number,
  initialDelay = 200,
  maxDelay = 10_000,
): number {
  const delay = initialDelay * Math.pow(2, attempt - 1);
  // Add jitter ±10%
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, maxDelay);
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Wraps an async function with retry logic.
 * Only retries on transient errors (network, timeout, 5xx).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, initialDelay = 200, maxDelay = 10_000, onRetry } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (!isRetryable(err) || attempt >= maxRetries) {
        throw err;
      }

      const delay = backoffDelay(attempt + 1, initialDelay, maxDelay);
      onRetry?.(attempt + 1, err);
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
