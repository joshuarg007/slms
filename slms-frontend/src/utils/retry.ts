// src/utils/retry.ts
// Production-ready retry utility with exponential backoff

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error) => {
    // Retry on network errors and 5xx server errors
    if (error instanceof TypeError && error.message.includes("fetch")) return true;
    if (error instanceof Response) {
      return error.status >= 500 || error.status === 429;
    }
    return false;
  },
  onRetry: () => {},
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxRetries || !opts.shouldRetry(error)) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        opts.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        opts.maxDelay
      );

      opts.onRetry(attempt + 1, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Hook for React components
import { useState, useCallback } from "react";

interface UseRetryResult<T> {
  execute: () => Promise<T | undefined>;
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
  retryCount: number;
}

export function useRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): UseRetryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setRetryCount(0);

    try {
      const result = await withRetry(fn, {
        ...options,
        onRetry: (attempt, err) => {
          setRetryCount(attempt);
          options.onRetry?.(attempt, err);
        },
      });
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [fn, options]);

  return { execute, data, error, isLoading, retryCount };
}

// Fetch wrapper with retry
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(input, init);
    if (!response.ok && response.status >= 500) {
      throw response;
    }
    return response;
  }, retryOptions);
}
