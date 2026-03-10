# System Architecture

## Services
1. API Service
- Auth, RBAC, tenant-aware APIs, admin operations
2. Webhook Service
- Signature verification, idempotency, event persistence, queue publish
3. Worker Service
- Retry jobs, sync jobs, token refresh jobs
4. Connector Layer
- Per-provider modules implementing a common interface

## Event Flow
1. Incoming webhook -> `webhook-router`
2. Signature check + idempotency check -> `webhook-service`
3. Persist event -> enqueue processing job
4. Worker executes business action
5. Failure -> retry queue with backoff
6. Exhausted retries -> dead letter + alert

## Security Model
- JWT access token + refresh sessions
- RBAC middleware
- Tenant scope guard
- Encrypted integration credentials
- Strict input validation + output sanitization
- API rate limiting and audit logs

## Observability
- Structured JSON logs
- API latency + error tracking via request logs table
- Queue depth and retry metrics
- Integration health checks per connector

## Admin Control
- Connect/disconnect provider
- View integration health/status
- Rotate credentials
- Replay webhook
- Trigger manual sync/retry
