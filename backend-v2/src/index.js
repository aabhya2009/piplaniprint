import http from 'node:http';
import { env } from './config/env.js';
import { logger } from './core/observability/logger.js';
import { webhookRouter } from './modules/webhooks/webhook-router.js';

const server = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'piplani-backend-v2' }));
    return;
  }

  if (req.url?.startsWith('/webhooks/')) {
    await webhookRouter(req, res);
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'Route not found' }));
});

server.listen(env.PORT, () => {
  logger.info('server_started', { port: env.PORT, env: env.NODE_ENV });
});
