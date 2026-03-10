const required = (name, fallback = '') => process.env[name] || fallback;

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 8090),
  JWT_SECRET: required('JWT_SECRET', 'dev-jwt-secret-change-me'),
  ENCRYPTION_KEY: required('ENCRYPTION_KEY', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  WEBHOOK_SIGNING_SECRET: required('WEBHOOK_SIGNING_SECRET', 'dev-webhook-secret'),
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/piplani',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER || ''
};
