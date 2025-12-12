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
        releaseDate: details.release_date?.date ? new Date(details.release_date.date) : undefined,
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
        releaseDate: details.release_date?.date ? new Date(details.release_date.date) : undefined,
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

  static async list(page: number, pageSize = 20) {
    const [items, total] = await prisma.$transaction([
      prisma.game.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { updatedAt: 'desc' } }),
      prisma.game.count()
    ]);
    return { items, hasMore: page * pageSize < total };
  }
}
