import { ingestWebhook } from './webhook-service.js';

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export async function webhookRouter(req, res) {
  const provider = req.url.split('/').pop() || 'unknown';
  const rawBody = await readRawBody(req);

  const result = await ingestWebhook({
    provider,
    rawBody,
    headers: req.headers
  });

  res.writeHead(result.status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(result));
}
