import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../db';

export type AuthRequest = Request & { user?: { id: string; email: string; steamId: string } };

/**
 * Authentication middleware: Validates JWT token and adds user to request.
 *
 * Token contains:
 * - userId: App's internal user ID
 * - email: User's email
 * - steamId: Their Steam ID (used for Steam API calls)
 *
 * Usage: router.get('/protected', authMiddleware, handler)
 */
export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing auth header' });

  const token = header.replace('Bearer ', '');
  try {
    const payload = verifyToken(token);

    // Validate user still exists in database
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Attach user info to request (includes steamId for Steam API calls)
    req.user = {
      id: payload.userId,
      email: payload.email,
      steamId: payload.steamId
    };
    next();
  } catch (err) {
    console.error('[Auth Middleware] Token validation failed:', (err as Error).message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
