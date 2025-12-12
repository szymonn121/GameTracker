import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { DashboardService } from '../services/dashboard-service';
import { verifyToken } from '../utils/jwt';

export const DashboardController = {
  get: async (req: AuthRequest, res: Response) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Missing auth header' });
    let userId: string;
    try {
      const token = header.replace('Bearer ', '');
      const payload = verifyToken(token);
      userId = payload.userId;
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (!userId) return res.status(401).json({ error: 'Invalid user' });
    
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
