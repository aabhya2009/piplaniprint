import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { ingestWebhook } from '../src/modules/webhooks/webhook-service.js';

const body = JSON.stringify({ id: 'evt_duplicate', type: 'order.updated' });
const sig = crypto.createHmac('sha256', 'dev-webhook-secret').update(body).digest('hex');

test('duplicate event is ignored', async () => {
  const first = await ingestWebhook({ provider: 'demo', rawBody: body, headers: { 'x-signature': sig } });
  const second = await ingestWebhook({ provider: 'demo', rawBody: body, headers: { 'x-signature': sig } });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.duplicate, true);
});
