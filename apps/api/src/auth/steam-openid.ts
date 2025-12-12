import https from 'https';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';

interface SteamOpenIDParams {
  [key: string]: string;
}

export class SteamAuth {
  private realm: string;
  private returnURL: string;

  constructor(realm: string, returnURL: string) {
    this.realm = realm;
    this.returnURL = returnURL;
  }

  // Generate Steam OpenID authentication URL
  getRedirectUrl(): string {
    const params = {
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': this.returnURL,
      'openid.realm': this.realm,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    };

    const query = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return `${STEAM_OPENID_URL}?${query}`;
  }

  // Verify Steam OpenID response
  async verifyAssertion(params: SteamOpenIDParams): Promise<string | null> {
    try {
      // Validate required parameters exist
      if (params['openid.mode'] !== 'id_res') {
        return null;
      }

      // Extract Steam ID from claimed_id
      const claimedId = params['openid.claimed_id'];
      if (!claimedId) {
        return null;
      }

      const steamIdMatch = claimedId.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/);
      if (!steamIdMatch) {
        return null;
      }

      const steamId = steamIdMatch[1];

      // Verify with Steam (simplified - in production you'd do full validation)
      const verifyParams = { ...params };
      verifyParams['openid.mode'] = 'check_authentication';

      const verified = await this.performSteamValidation(verifyParams);
      
      return verified ? steamId : null;
    } catch (error) {
      console.error('Steam verification error:', error);
      return null;
    }
  }

  private performSteamValidation(params: SteamOpenIDParams): Promise<boolean> {
    return new Promise((resolve) => {
      const postData = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      const options = {
        hostname: 'steamcommunity.com',
        port: 443,
        path: '/openid/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve(data.includes('is_valid:true'));
        });
      });

      req.on('error', () => resolve(false));
      req.write(postData);
      req.end();
    });
  }
}
