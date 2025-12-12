/**
 * JWT Token Management
 *
 * Role: Create and verify tokens that identify a logged-in user
 * - Token contains userId (app's user identifier) and steamId
 * - Token does NOT contain API Key or any sensitive server data
 * - Token proves user is logged in and which Steam account they own
 */

import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  userId: string;    // Our database user ID
  email: string;     // User's email
  steamId: string;   // Their Steam ID (for frontend/logging)
}

/**
 * Create a JWT token after successful Steam login.
 *
 * @param payload - User data including userId and steamId
 * @returns Signed JWT token valid for 7 days
 */
export function signToken(payload: JwtPayload): string {
  console.log(`[JWT] Signing token for userId: ${payload.userId}, steamId: ${payload.steamId}`);
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

/**
 * Verify a JWT token and extract user data.
 *
 * @param token - JWT token from Authorization header
 * @returns Decoded payload with userId and steamId
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    return payload;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
}
