import { requestWithPolicy } from '../../../core/http/http-client.js';

export class GoogleOAuthClient {
  async exchangeCode({ code, clientId, clientSecret, redirectUri }) {
    return requestWithPolicy({
      method: 'POST',
      url: 'https://oauth2.googleapis.com/token',
      body: {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      },
      maxRetries: 1
    });
  }
}
