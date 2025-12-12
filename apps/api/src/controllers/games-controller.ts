import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { GameService } from '../services/game-service';

export const GamesController = {
  list: async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const userId = req.user?.id;
      const data = await GameService.list(page, 20, userId);
      console.log(`[GamesController] Returning ${data.items.length} games for page ${page}`);
      res.json(data);
    } catch (err) {
      console.error('[GamesController] Error listing games:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  },
  detail: async (req: AuthRequest, res: Response) => {
    try {
      const game = await GameService.getGame(req.params.id);
      if (!game) return res.status(404).json({ error: 'Not found' });
      res.json(game);
    } catch (err) {
      console.error('[GamesController] Error getting game detail:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  }
};
