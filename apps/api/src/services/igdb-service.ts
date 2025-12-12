import axios from 'axios';
import { CacheService } from './cache-service';

export interface RAWGGame {
  name: string;
  background_image?: string;
  genres?: { name: string }[];
  description?: string;
  rating?: number;
  released?: string;
  screenshots?: { image: string }[];
  tags?: { name: string }[];
}

export class IGDBService {
  // Uses Steam API for game enrichment
  static async getGame(steamAppId: number): Promise<RAWGGame | null> {
    const cacheKey = `game:${steamAppId}`;
    const cached = await CacheService.get<RAWGGame>(cacheKey);
    if (cached) return cached;
    
    try {
      // Get game details from Steam API
      const { data } = await axios.get('https://store.steampowered.com/api/appdetails', {
        params: {
          appids: steamAppId,
          json: 1
        },
        timeout: 5000
      });

      const gameData = data[steamAppId]?.data;
      if (!gameData || !data[steamAppId]?.success) return null;

      // Transform Steam API response to our format
      const game: RAWGGame = {
        name: gameData.name,
        background_image: gameData.header_image,
        description: gameData.short_description,
        released: gameData.release_date?.date,
        rating: gameData.metacritic?.score ? gameData.metacritic.score / 10 : undefined,
        genres: gameData.genres?.map((g: { description: string }) => ({ name: g.description })) || [],
        tags: gameData.categories?.map((c: { description: string }) => ({ name: c.description })) || [],
        screenshots: gameData.screenshots?.map((s: { path_full: string }) => ({ image: s.path_full })) || []
      };

      await CacheService.set(cacheKey, game, 86400, 'steam');
      return game;
    } catch (err) {
      console.error(`[GameService] Failed to fetch game ${steamAppId}:`, err);
      return null;
    }
  }
}
