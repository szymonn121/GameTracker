import { prisma } from '../db';
import { SteamService } from './steam-service';
import { IGDBService, type RAWGGame } from './igdb-service';
import { HLTBService } from './hltb-service';
import { SimilarityService } from './similarity-service';

export class GameService {
  static async upsertGameFromSteam(steamAppId: number) {
    const details = await SteamService.getAppDetails(steamAppId);
    if (!details) return null;
    
    // Try to fetch enriched data from RAWG (optional - skip if fails)
    let rawgData: RAWGGame | null = null;
    try {
      rawgData = await IGDBService.getGame(steamAppId);
    } catch (error) {
      console.warn(`[GameService] Could not fetch RAWG data for ${steamAppId}, using Steam data only`);
    }

    const id = `steam:${steamAppId}`;
    
    // Prepare data with proper JSON serialization
    const genresArray = rawgData?.genres?.map((g) => g.name) ||
      details.genres?.map((g: { description: string }) => g.description) || [];
    const tagsArray = rawgData?.tags?.map((t) => t.name) ||
      details?.categories?.map((c: { description: string }) => c.description) || [];
    const screenshotsArray = rawgData?.screenshots?.map((s) => s.image) ||
      details.screenshots?.map((s: { path_full: string }) => s.path_full) || [];
    
    // Parse release date safely
    const parseReleaseDate = (dateStr: string | undefined): Date | null => {
      if (!dateStr) return null;
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    };
    
    const game = await prisma.game.upsert({
      where: { id },
      update: {
        name: details.name,
        steamAppId,
        coverUrl: rawgData?.background_image || details.header_image,
        genres: JSON.stringify(genresArray),
        tags: JSON.stringify(tagsArray),
        summary: rawgData?.description || details.short_description,
        rating: rawgData?.rating ? Math.round(rawgData.rating * 10) : details.metacritic?.score,
        releaseDate: parseReleaseDate(details.release_date?.date),
        screenshots: JSON.stringify(screenshotsArray)
      },
      create: {
        id,
        name: details.name,
        steamAppId,
        coverUrl: rawgData?.background_image || details.header_image,
        genres: JSON.stringify(genresArray),
        tags: JSON.stringify(tagsArray),
        summary: rawgData?.description || details.short_description,
        rating: rawgData?.rating ? Math.round(rawgData.rating * 10) : details.metacritic?.score,
        releaseDate: parseReleaseDate(details.release_date?.date),
        screenshots: JSON.stringify(screenshotsArray)
      }
    });
    return game;
  }

  static async getGame(id: string) {
    const game = await prisma.game.findUnique({ where: { id } });
    if (!game) return null;
    const hltb = await HLTBService.getEstimate(game.name);
    const similar = await SimilarityService.getSimilar(id);
    const playtime = await prisma.userGame.aggregate({ _sum: { hours: true }, where: { gameId: id } });
    return { game, hltb, similar, playtime: { hours: playtime._sum.hours || 0 } };
  }

  static async list(page: number, pageSize = 20, userId?: string) {
    console.log(`[GameService.list] Fetching games for userId: ${userId}`);
    const [items, total] = await prisma.$transaction([
      prisma.game.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { updatedAt: 'desc' } }),
      prisma.game.count()
    ]);
    
    // Fetch playtime for each game if userId is provided
    let itemsWithPlaytime = items;
    if (userId) {
      console.log(`[GameService.list] Fetching playtime for ${items.length} games`);
      itemsWithPlaytime = await Promise.all(
        items.map(async (game) => {
          const userGame = await prisma.userGame.findUnique({
            where: { userId_gameId: { userId, gameId: game.id } }
          });
          return {
            ...game,
            playtime: userGame ? { hours: userGame.hours } : { hours: 0 }
          };
        })
      );
    } else {
      console.log(`[GameService.list] No userId provided, skipping playtime fetch`);
      itemsWithPlaytime = items.map(game => ({
        ...game,
        playtime: { hours: 0 }
      }));
    }
    
    return { items: itemsWithPlaytime, hasMore: page * pageSize < total };
  }
}
