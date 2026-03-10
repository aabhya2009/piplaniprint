import crypto from 'node:crypto';
import { env } from '../../config/env.js';

function keyBuffer() {
  return Buffer.from(env.ENCRYPTION_KEY, 'hex');
}

export function encryptText(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptText(encoded) {
  const raw = Buffer.from(encoded, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const content = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(content), decipher.final()]);
  return plain.toString('utf8');
}
