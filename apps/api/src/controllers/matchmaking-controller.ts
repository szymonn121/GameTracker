import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { MatchmakingService } from '../services/matchmaking-service';

// Default user ID for demo/unauthenticated mode
const DEFAULT_USER_ID = 'default-user';

export const MatchmakingController = {
  recommend: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id || DEFAULT_USER_ID;
    const results = await MatchmakingService.suggest(userId);
    res.json(results);
  }
};
