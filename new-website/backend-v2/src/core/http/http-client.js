import crypto from 'node:crypto';
import { shouldRetry } from '../retry/retry-policy.js';

export async function requestWithPolicy({
  method = 'GET',
  url,
  headers = {},
  body,
  timeoutMs = 15_000,
  maxRetries = 3,
  signingSecret = ''
}) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const payload = body ? JSON.stringify(body) : '';
      const signedHeaders = { ...headers };
      if (signingSecret) {
        const signature = crypto.createHmac('sha256', signingSecret).update(payload).digest('hex');
        signedHeaders['x-request-signature'] = signature;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'content-type': 'application/json',
          ...signedHeaders
        },
        body: payload || undefined,
        signal: controller.signal
      });

      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (!res.ok && shouldRetry(res.status) && attempt < maxRetries) {
        attempt += 1;
        continue;
      }

      return { ok: res.ok, status: res.status, data };
    } catch (error) {
      clearTimeout(timer);
      if (attempt >= maxRetries || !shouldRetry(null, error?.code)) {
        return { ok: false, status: 0, data: { error: error.message || 'request_failed' } };
      }
      attempt += 1;
    }
  }

  return { ok: false, status: 0, data: { error: 'max_retries_exceeded' } };
}
