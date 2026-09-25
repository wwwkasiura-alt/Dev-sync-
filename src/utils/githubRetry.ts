export type RetryStrategy = 'exponential' | 'linear' | 'fixed';

export interface RetryAttemptLog {
  id: string;
  attemptNumber: number;
  maxAttempts: number;
  timestamp: number;
  status: 'pending' | 'success' | 'failed' | 'retrying' | 'cancelled';
  delayMs?: number;
  errorMessage?: string;
  strategyUsed?: RetryStrategy;
}

export interface RetryConfig {
  autoRetry: boolean;
  maxRetries: number; // default: 3
  baseBackoffMs: number; // default: 2000
  strategy: RetryStrategy; // 'exponential' | 'linear' | 'fixed'
  useJitter?: boolean; // default: true
  maxBackoffMs?: number; // default: 30000
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  autoRetry: true,
  maxRetries: 3,
  baseBackoffMs: 2000,
  strategy: 'exponential',
  useJitter: true,
  maxBackoffMs: 30000,
};

/**
 * Calculates backoff delay in milliseconds based on attempt number and strategy.
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number = 2000,
  strategy: RetryStrategy = 'exponential',
  useJitter: boolean = true,
  maxDelayMs: number = 30000
): number {
  let calculated = baseDelayMs;

  switch (strategy) {
    case 'exponential':
      // 2^(attempt - 1) * baseDelay (e.g., attempt 1 = base, attempt 2 = 2*base, attempt 3 = 4*base)
      calculated = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
      break;
    case 'linear':
      // attempt * baseDelay (e.g., attempt 1 = 1*base, attempt 2 = 2*base, attempt 3 = 3*base)
      calculated = baseDelayMs * Math.max(1, attempt);
      break;
    case 'fixed':
    default:
      calculated = baseDelayMs;
      break;
  }

  // Cap at maxDelay
  calculated = Math.min(calculated, maxDelayMs);

  // Apply ±15% full randomized jitter to prevent synchronized retry spikes
  if (useJitter) {
    const jitterFactor = 0.85 + Math.random() * 0.3; // between 0.85 and 1.15
    calculated = Math.round(calculated * jitterFactor);
  }

  return Math.max(250, calculated);
}

/**
 * Determines whether an error is transient and should be retried.
 * 401 Unauthorized or 404 Not Found (e.g. invalid repo owner) are non-transient.
 */
export function isRetryableError(error: any): boolean {
  if (!error) return true;

  const msg = (typeof error === 'string' ? error : error.message || '').toLowerCase();
  
  // Non-retryable authentication & syntax errors
  if (
    msg.includes('bad credentials') ||
    msg.includes('invalid or expired github token') ||
    msg.includes('personal access token is required') ||
    msg.includes('401') ||
    msg.includes('403 forbidden: rate limit exceeded and no retry possible') ||
    msg.includes('cannot push to protected branch without rights')
  ) {
    return false;
  }

  // Network drops, socket hangup, 500, 502, 503, 504, 429 rate limit, fetch failed are retryable
  return true;
}

export interface ExecuteWithRetryCallbacks {
  onAttemptStart?: (attempt: number, maxAttempts: number) => void;
  onAttemptFailed?: (attempt: number, maxAttempts: number, error: any, nextDelayMs: number) => void;
  onCountdownTick?: (remainingMs: number, attempt: number, maxAttempts: number) => void;
  onSuccess?: (result: any, attempt: number) => void;
  onExhausted?: (lastError: any, totalAttempts: number) => void;
}

/**
 * Execute an asynchronous action with auto-retry and configurable backoff.
 */
export async function executeWithRetry<T>(
  action: (attemptNumber: number) => Promise<T>,
  config: Partial<RetryConfig> = {},
  callbacks: ExecuteWithRetryCallbacks = {},
  isCancelled?: () => boolean
): Promise<T> {
  const fullConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  const maxAttempts = fullConfig.autoRetry ? Math.max(1, fullConfig.maxRetries + 1) : 1;
  let attempt = 1;
  let lastError: any = null;

  while (attempt <= maxAttempts) {
    if (isCancelled && isCancelled()) {
      throw new Error('Operation was cancelled by user');
    }

    callbacks.onAttemptStart?.(attempt, maxAttempts);

    try {
      const result = await action(attempt);
      callbacks.onSuccess?.(result, attempt);
      return result;
    } catch (err: any) {
      lastError = err;
      const isLast = attempt >= maxAttempts;
      const canRetry = fullConfig.autoRetry && !isLast && isRetryableError(err);

      if (!canRetry) {
        break;
      }

      const nextDelayMs = calculateBackoffDelay(
        attempt,
        fullConfig.baseBackoffMs,
        fullConfig.strategy,
        fullConfig.useJitter,
        fullConfig.maxBackoffMs
      );

      callbacks.onAttemptFailed?.(attempt, maxAttempts, err, nextDelayMs);

      // Countdown in 100ms intervals so UI stays responsive and user can cancel/fast-forward
      const startTime = Date.now();
      while (Date.now() - startTime < nextDelayMs) {
        if (isCancelled && isCancelled()) {
          throw new Error('Operation cancelled during retry countdown');
        }
        const remaining = Math.max(0, nextDelayMs - (Date.now() - startTime));
        callbacks.onCountdownTick?.(remaining, attempt, maxAttempts);
        await new Promise((r) => setTimeout(r, 100));
      }

      attempt++;
    }
  }

  callbacks.onExhausted?.(lastError, attempt);
  throw lastError || new Error('All retry attempts failed');
}
