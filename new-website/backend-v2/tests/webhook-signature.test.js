import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyHmacSha256 } from '../src/modules/webhooks/signature.js';

const body = JSON.stringify({ id: 'evt_1', type: 'payment.captured' });
const secret = 'test-secret';
const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');

test('valid signature passes', () => {
  assert.equal(verifyHmacSha256(body, sig, secret), true);
});

test('invalid signature fails', () => {
  assert.equal(verifyHmacSha256(body, 'bad-signature', secret), false);
});
