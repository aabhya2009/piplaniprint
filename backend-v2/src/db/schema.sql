CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(190) NOT NULL,
  password_hash TEXT,
  full_name VARCHAR(150),
  phone VARCHAR(30),
  auth_provider VARCHAR(30) NOT NULL DEFAULT 'local',
  provider_user_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE roles (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  code VARCHAR(120) UNIQUE NOT NULL,
  name VARCHAR(180) NOT NULL
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  refresh_token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(64),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE integration_configs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  provider_name VARCHAR(80) NOT NULL,
  purpose VARCHAR(120) NOT NULL,
  auth_type VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'disconnected',
  api_base_url TEXT,
  webhook_url TEXT,
  webhook_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  rate_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  retry_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_codes JSONB NOT NULL DEFAULT '{}'::jsonb,
  monthly_cost_estimate NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider_name, purpose)
);

CREATE TABLE integration_credentials (
  id UUID PRIMARY KEY,
  integration_config_id UUID NOT NULL REFERENCES integration_configs(id) ON DELETE CASCADE,
  credential_key VARCHAR(120) NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (integration_config_id, credential_key)
);

CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY,
  integration_config_id UUID NOT NULL REFERENCES integration_configs(id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_type VARCHAR(30),
  scope TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE external_id_mappings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  provider_name VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  internal_id VARCHAR(120) NOT NULL,
  external_id VARCHAR(180) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider_name, entity_type, external_id)
);

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  provider_name VARCHAR(80) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  external_event_id VARCHAR(255),
  idempotency_key VARCHAR(255) NOT NULL,
  signature_valid BOOLEAN NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'received',
  attempts INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE (provider_name, idempotency_key)
);

CREATE TABLE api_request_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  integration_config_id UUID REFERENCES integration_configs(id),
  provider_name VARCHAR(80) NOT NULL,
  request_method VARCHAR(10) NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INT,
  latency_ms INT,
  request_id VARCHAR(120),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sync_status (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  provider_name VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_cursor VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'idle',
  error_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider_name, entity_type)
);

CREATE TABLE retry_jobs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  job_type VARCHAR(80) NOT NULL,
  provider_name VARCHAR(80),
  payload JSONB NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80),
  entity_id VARCHAR(120),
  ip_address VARCHAR(64),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_status_retry ON webhook_events(status, next_retry_at);
CREATE INDEX idx_retry_jobs_status_next_run ON retry_jobs(status, next_run_at);
CREATE INDEX idx_api_logs_provider_created_at ON api_request_logs(provider_name, created_at);
