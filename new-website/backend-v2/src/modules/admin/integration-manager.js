import { encryptText } from '../../core/security/crypto.js';

export class IntegrationManager {
  constructor() {
    this.items = [];
  }

  connect(config) {
    const item = {
      id: `int_${Date.now()}`,
      providerName: config.providerName,
      purpose: config.purpose,
      authType: config.authType,
      credentials: Object.fromEntries(
        Object.entries(config.credentials || {}).map(([k, v]) => [k, encryptText(String(v))])
      ),
      apiEndpoints: config.apiEndpoints || [],
      webhookEvents: config.webhookEvents || [],
      rateLimits: config.rateLimits || {},
      retryPolicy: config.retryPolicy || {},
      errorCodes: config.errorCodes || {},
      monthlyCostEstimate: Number(config.monthlyCostEstimate || 0),
      status: 'connected',
      createdAt: new Date().toISOString()
    };
    this.items.push(item);
    return item;
  }

  disconnect(id) {
    const target = this.items.find((x) => x.id === id);
    if (!target) return null;
    target.status = 'disconnected';
    return target;
  }

  list() {
    return this.items;
  }
}
