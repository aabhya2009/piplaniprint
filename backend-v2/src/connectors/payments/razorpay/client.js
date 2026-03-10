import { requestWithPolicy } from '../../../core/http/http-client.js';

export class RazorpayClient {
  constructor({ keyId, keySecret }) {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  authHeader() {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    return { Authorization: `Basic ${auth}` };
  }

  async createPayment(payload) {
    return requestWithPolicy({
      method: 'POST',
      url: 'https://api.razorpay.com/v1/orders',
      headers: this.authHeader(),
      body: payload,
      timeoutMs: 15000,
      maxRetries: 2
    });
  }

  async fetchPayment(paymentId) {
    return requestWithPolicy({
      method: 'GET',
      url: `https://api.razorpay.com/v1/payments/${paymentId}`,
      headers: this.authHeader(),
      timeoutMs: 12000,
      maxRetries: 2
    });
  }
}
