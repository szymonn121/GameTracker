import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { signToken } from '../utils/jwt';

/**
 * Traditional email/password authentication (deprecated in favor of Steam OpenID)
 *
 * New users should use Steam OpenID (/auth/steam) for authentication.
 * These endpoints are kept for backward compatibility with existing email-based users.
 */

export const AuthController = {
  /**
   * Register a new user with email and password
   *
   * DEPRECATED: Use Steam OpenID authentication instead
   * Kept for backward compatibility with existing systems
   */
  register: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Check if user already exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const hash = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: hash,
          profile: {
            create: {
              displayName: email.split('@')[0] || email
            }
          }
        }
      });

      // Create token (no steamId for email-based users)
      const token = signToken({ userId: user.id, email: user.email, steamId: '' });

      console.log(`[Auth] User registered: ${email}`);
      res.json({ token, userId: user.id });
    } catch (error) {
      console.error('[Auth Register] Error:', error);
      res.status(500).json({ error: 'Registration failed', details: (error as Error).message });
    }
  },

  /**
   * Login with email and password
   *
   * DEPRECATED: Use Steam OpenID authentication instead
   * Kept for backward compatibility with existing systems
   */
  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Find user
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Create token
      const token = signToken({ userId: user.id, email: user.email, steamId: '' });

      console.log(`[Auth] User logged in: ${email}`);
      res.json({ token, userId: user.id });
    } catch (error) {
      console.error('[Auth Login] Error:', error);
      res.status(500).json({ error: 'Login failed', details: (error as Error).message });
    }
  }
};
