export class BaseConnector {
  constructor({ providerName, purpose, client, authManager }) {
    this.providerName = providerName;
    this.purpose = purpose;
    this.client = client;
    this.authManager = authManager;
  }

  async healthCheck() {
    return { ok: true, provider: this.providerName, purpose: this.purpose };
  }

  async execute(request) {
    const token = await this.authManager.getAccessToken();
    return this.client.send({ ...request, token });
  }

  parseResponse(raw) {
    return raw;
  }

  async handleWebhook(_event) {
    return { handled: true };
  }
}
