import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { DashboardService } from '../services/dashboard-service';
import { verifyToken } from '../utils/jwt';

// Default user ID for demo/unauthenticated mode
const DEFAULT_USER_ID = 'default-user';

export const DashboardController = {
  get: async (req: AuthRequest, res: Response) => {
    let userId = DEFAULT_USER_ID;
    
    // Try to extract user from auth header if present
    const header = req.headers.authorization;
    if (header) {
      try {
        const token = header.replace('Bearer ', '');
        const payload = verifyToken(token);
        userId = payload.userId;
      } catch (err) {
        console.warn('[Dashboard] Failed to verify auth token:', (err as Error).message);
      }
    }
    
    // Also check req.user (if middleware ran)
    if (req.user?.id) {
      userId = req.user.id;
    }
    
    console.log(`[Dashboard] Loading dashboard for user: ${userId}`);
    try {
      const data = await DashboardService.getDashboard(userId);
      res.json(data);
    } catch (err) {
      console.error('[Dashboard] Error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  }
};
