import crypto from 'node:crypto';
import { env } from '../../config/env.js';

function base64url(input) {
  return Buffer.from(JSON.stringify(input)).toString('base64url');
}

export function signJwt(payload, expiresInSeconds = 900) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const encoded = `${base64url(header)}.${base64url(body)}`;
  const sig = crypto.createHmac('sha256', env.JWT_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyJwt(token) {
  const [h, p, s] = String(token || '').split('.');
  if (!h || !p || !s) return { valid: false, error: 'invalid_format' };
  const check = crypto.createHmac('sha256', env.JWT_SECRET).update(`${h}.${p}`).digest('base64url');
  if (check !== s) return { valid: false, error: 'bad_signature' };
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return { valid: false, error: 'expired' };
  return { valid: true, payload };
}
