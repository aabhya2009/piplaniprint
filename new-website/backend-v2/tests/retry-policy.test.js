import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRetry, nextDelayMs } from '../src/core/retry/retry-policy.js';

test('retries 429 and 5xx', () => {
  assert.equal(shouldRetry(429), true);
  assert.equal(shouldRetry(503), true);
  assert.equal(shouldRetry(400), false);
});

test('delay schedule increases', () => {
  assert.equal(nextDelayMs(0), 30000);
  assert.equal(nextDelayMs(1), 120000);
  assert.equal(nextDelayMs(2), 600000);
});
