const DEFAULT_DELAYS_MS = [30_000, 120_000, 600_000, 1_800_000, 7_200_000];

export function shouldRetry(statusCode, errorCode = '') {
  if (!statusCode) return true;
  if (statusCode === 429) return true;
  if (statusCode >= 500) return true;
  if (errorCode === 'ETIMEDOUT' || errorCode === 'ECONNRESET') return true;
  return false;
}

export function nextDelayMs(attempt) {
  return DEFAULT_DELAYS_MS[Math.min(attempt, DEFAULT_DELAYS_MS.length - 1)];
}
