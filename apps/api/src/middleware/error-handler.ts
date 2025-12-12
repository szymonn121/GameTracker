import { Request, Response } from 'express';
import { logger } from '../logger';

export function errorHandler(err: unknown, _req: Request, res: Response) {
  logger.error(err);
  const status = (err as { status?: number }).status || 500;
  res.status(status).json({ error: (err as Error).message || 'Internal server error' });
}
