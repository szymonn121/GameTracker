import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { DashboardService } from '../services/dashboard-service';

// Default user ID for demo/unauthenticated mode
const DEFAULT_USER_ID = 'default-user';

export const DashboardController = {
  get: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id || DEFAULT_USER_ID;
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
