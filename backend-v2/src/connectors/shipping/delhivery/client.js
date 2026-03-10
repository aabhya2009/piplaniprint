import { requestWithPolicy } from '../../../core/http/http-client.js';

export class DelhiveryClient {
  constructor({ token }) {
    this.token = token;
  }

  headers() {
    return {
      Authorization: `Token ${this.token}`
    };
  }

  async createShipment(payload) {
    return requestWithPolicy({
      method: 'POST',
      url: 'https://track.delhivery.com/api/cmu/create.json',
      headers: this.headers(),
      body: payload,
      maxRetries: 3
    });
  }

  async track(waybill) {
    return requestWithPolicy({
      method: 'GET',
      url: `https://track.delhivery.com/api/v1/packages/json/?waybill=${encodeURIComponent(waybill)}`,
      headers: this.headers(),
      maxRetries: 2
    });
  }
}
