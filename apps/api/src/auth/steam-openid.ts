/**
 * Steam OpenID 2.0 Authentication Handler
 *
 * Role: Extract steamid64 from Steam's OpenID response
 * - Does NOT identify the user in our system
 * - Does NOT require API Key (OpenID is authentication-only)
 * - Returns pure steamid64 (e.g., "76561198000000000")
 *
 * Flow:
 * 1. User clicks "Login with Steam"
 * 2. Redirect to Steam OpenID endpoint
 * 3. Steam redirects back with openid.* parameters
 * 4. We validate the response cryptographically
 * 5. Extract steamid64 from openid.claimed_id
 * 6. Return steamid64 to route handler
 *
 * After OpenID validation, the backend will:
 * - Create or find user in database
 * - Use server's global API key to fetch their profile/games
 * - Issue JWT token containing steamid64
 */

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

  /**
   * Generate redirect URL for Steam OpenID login.
   * User's browser is redirected here; Steam handles authentication.
   *
   * @returns Full URL to redirect user to Steam OpenID
   */
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

  /**
   * Verify Steam OpenID response and extract steamid64.
   *
   * This performs two checks:
   * 1. Validates the openid.mode is 'id_res' (successful authentication)
   * 2. Validates with Steam servers using cryptographic verification
   *
   * @param params Query parameters from Steam's redirect
   * @returns Steam ID (string of digits) or null if verification fails
   *
   * Example return: "76561198000000000"
   */
  async verifyAssertion(params: SteamOpenIDParams): Promise<string | null> {
    try {
      // Validate required parameters
      if (!params['openid.mode']) {
        console.warn('[OpenID] Missing openid.mode');
        return null;
      }

      if (params['openid.mode'] !== 'id_res') {
        console.warn('[OpenID] Invalid openid.mode (expected "id_res"):', params['openid.mode']);
        return null;
      }

      const claimedId = params['openid.claimed_id'];
      if (!claimedId) {
        console.warn('[OpenID] Missing openid.claimed_id');
        return null;
      }

      // Extract steamid64 from URL like: https://steamcommunity.com/openid/id/76561198000000000
      const steamIdMatch = claimedId.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/);
      if (!steamIdMatch || !steamIdMatch[1]) {
        console.warn('[OpenID] Could not extract steamid from claimed_id:', claimedId);
        return null;
      }

      const steamId = steamIdMatch[1];

      // Verify authenticity with Steam servers
      const verifyParams = { ...params };
      verifyParams['openid.mode'] = 'check_authentication';

      const verified = await this.performSteamValidation(verifyParams);
      if (!verified) {
        console.warn('[OpenID] Steam validation failed for steamid:', steamId);
        return null;
      }

      console.log(`[OpenID] ✓ Successfully verified steamid64: ${steamId}`);
      return steamId;
    } catch (error) {
      console.error('[OpenID] Verification error:', error);
      return null;
    }
  }

  /**
   * Perform cryptographic verification with Steam servers.
   *
   * This sends the OpenID response back to Steam to verify it's genuine.
   *
   * @param params OpenID parameters with mode set to 'check_authentication'
   * @returns true if Steam confirms the response is valid
   */
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
          const valid = data.includes('is_valid:true');
          console.log(`[OpenID] Steam validation response: ${valid ? 'valid' : 'invalid'}`);
          resolve(valid);
        });
      });

      req.on('error', (err) => {
        console.error('[OpenID] Validation request error:', err);
        resolve(false);
      });

      req.write(postData);
      req.end();
    });
  }
}
