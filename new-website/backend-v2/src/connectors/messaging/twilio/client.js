import { requestWithPolicy } from '../../../core/http/http-client.js';

export class TwilioClient {
  constructor({ accountSid, authToken, fromNumber }) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
  }

  async send({ to, message }) {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return { ok: false, status: 0, data: { error: 'twilio_not_configured' } };
    }

    const body = new URLSearchParams({ To: to, From: this.fromNumber, Body: message });
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }
}
