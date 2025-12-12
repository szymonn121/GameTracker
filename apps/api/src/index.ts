import { createServer } from './server';
import { config } from './config';
import { logger } from './logger';
import cron from 'node-cron';
import { SimilarityService } from './services/similarity-service';
import { prisma } from './db';

async function main() {
  const app = createServer();
  app.listen(config.port, () => logger.info(`API listening on :${config.port}`));

  // Refresh similarity cache daily
  cron.schedule('0 3 * * *', async () => {
    const games = await prisma.game.findMany({ select: { id: true } });
    for (const g of games) {
      await SimilarityService.buildCacheFor(g.id);
    }
  });
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
