# Piplani PrintLab Backend V2 (Production Scaffold)

This folder contains a production-grade backend architecture scaffold designed for multi-integration platforms.

## Included
- Modular integration connector framework
- Webhook ingestion and verification flow
- Retry queue with exponential backoff
- RBAC middleware and tenant-aware auth helper
- HTTP client with timeout, signing, and retry support
- PostgreSQL schema for all core entities
- Structured logging helper and health metrics scaffold
- Automated tests for key integration behaviors

## Run tests
```bash
cd backend-v2
npm test
```

## Start scaffold server
```bash
cd backend-v2
npm start
```

## Required env vars (minimum)
- `JWT_SECRET`
- `ENCRYPTION_KEY` (32-byte hex for AES-256-GCM)
- `WEBHOOK_SIGNING_SECRET`

## For live provider integrations
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- Razorpay: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- Delhivery: `DELHIVERY_TOKEN`
