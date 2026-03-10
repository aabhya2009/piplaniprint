import { env } from '../../config/env.js';
import { verifyHmacSha256 } from './signature.js';
import { InMemoryIdempotencyStore } from './idempotency-store.js';
import { logger } from '../../core/observability/logger.js';

const store = new InMemoryIdempotencyStore();

export async function ingestWebhook({ provider, rawBody, headers }) {
  const signature = headers['x-signature'] || headers['x-webhook-signature'] || '';
  const signatureValid = verifyHmacSha256(rawBody, signature, env.WEBHOOK_SIGNING_SECRET);
  if (!signatureValid) {
    return { ok: false, status: 401, error: 'invalid_signature' };
  }

  const payload = JSON.parse(rawBody || '{}');
  const idempotencyKey = String(payload.id || headers['x-event-id'] || '');
  if (!idempotencyKey) return { ok: false, status: 400, error: 'missing_event_id' };

  if (await store.has(`${provider}:${idempotencyKey}`)) {
    return { ok: true, status: 200, duplicate: true };
  }

  await store.put(`${provider}:${idempotencyKey}`);
  logger.info('webhook_received', { provider, idempotencyKey, eventType: payload.type || 'unknown' });

  return {
    ok: true,
    status: 202,
    duplicate: false,
    event: {
      provider,
      idempotencyKey,
      eventType: payload.type || 'unknown',
      payload
    }
  };
}
