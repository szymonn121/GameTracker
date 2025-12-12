/**
 * Steam Web API Service
 *
 * Role: Fetch user data from Steam using the single server API Key
 * - All requests use config.steamApiKey (NOT user keys)
 * - API Key serves ONLY to authorize API calls (rate limits, quotas)
 * - API Key does NOT identify the user or link to our account
 * - Each call specifies the target steamid
 *
 * Example flow:
 * 1. Frontend sends: POST /api/user-stats { userId: "abc", steamId: "76561198000000000" }
 * 2. Backend validates JWT token (proves user is logged in)
 * 3. Backend extracts steamId from token
 * 4. SteamService.getOwnedGames(steamId) uses config.steamApiKey
 * 5. Steam responds with data for that steamId
 */

import axios from 'axios';
import { config } from '../config';
import { CacheService } from './cache-service';

const STEAM_BASE = 'https://api.steampowered.com';
const STORE_BASE = 'https://store.steampowered.com/api';

export class SteamService {
  // Single server API Key for all requests
  private static key = config.steamApiKey;

  /**
   * Get all games owned by a Steam user.
   * Uses the server's single API Key.
   *
   * @param steamId - The target Steam user ID (e.g., "76561198000000000")
   * @returns Game list with playtime, or null if profile is private
   */
  static async getOwnedGames(steamId: string) {
    if (!steamId) throw new Error('steamId is required');

    const cacheKey = `steam:owned:${steamId}`;
    const cached = await CacheService.get<unknown>(cacheKey);
    if (cached) {
      console.log(`[SteamService] Owned games cache hit for ${steamId}`);
      return cached;
    }

    console.log(`[SteamService] Fetching owned games for steamId: ${steamId}`);
    const url = `${STEAM_BASE}/IPlayerService/GetOwnedGames/v0001/?key=${this.key}&steamid=${steamId}&include_appinfo=true&include_played_free_games=1&format=json`;

    try {
      const { data } = await axios.get(url, { timeout: 10000 });
      const response = data.response;

      if (response.games === undefined || response.games === null) {
        console.warn(`[SteamService] Profile might be private or has no games: ${steamId}`);
        return null;
      }

      await CacheService.set(cacheKey, response, 3600, 'steam');
      console.log(`[SteamService] Fetched ${response.games?.length || 0} games for ${steamId}`);
      return response;
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.error('[SteamService] API Key invalid or revoked');
      } else if (error.response?.status === 403) {
        console.warn(`[SteamService] Profile for ${steamId} is private (403)`);
      } else {
        console.error(`[SteamService] Failed to fetch owned games: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Get recently played games for a Steam user.
   *
   * @param steamId - The target Steam user ID
   * @returns Recently played games or null if unavailable
   */
  static async getRecentlyPlayed(steamId: string) {
    if (!steamId) throw new Error('steamId is required');

    const cacheKey = `steam:recent:${steamId}`;
    const cached = await CacheService.get<unknown>(cacheKey);
    if (cached) {
      console.log(`[SteamService] Recently played cache hit for ${steamId}`);
      return cached;
    }

    console.log(`[SteamService] Fetching recently played for steamId: ${steamId}`);
    const url = `${STEAM_BASE}/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${this.key}&steamid=${steamId}&format=json`;

    try {
      const { data } = await axios.get(url, { timeout: 10000 });
      const response = data.response;
      await CacheService.set(cacheKey, response, 1800, 'steam');
      console.log(`[SteamService] Fetched ${response.games?.length || 0} recently played for ${steamId}`);
      return response;
    } catch (error: any) {
      console.warn(`[SteamService] Failed to fetch recently played for ${steamId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get player profile summary (nickname, avatar, profile URL, etc.).
   *
   * @param steamId - The target Steam user ID
   * @returns Player summary object or null
   */
  static async getPlayerSummaries(steamId: string) {
    if (!steamId) throw new Error('steamId is required');

    const cacheKey = `steam:player:${steamId}`;
    const cached = await CacheService.get<unknown>(cacheKey);
    if (cached) {
      console.log(`[SteamService] Player summary cache hit for ${steamId}`);
      return cached;
    }

    console.log(`[SteamService] Fetching player summary for steamId: ${steamId}`);
    const url = `${STEAM_BASE}/ISteamUser/GetPlayerSummaries/v0002/?key=${this.key}&steamids=${steamId}`;

    try {
      const { data } = await axios.get(url, { timeout: 10000 });
      const summary = data.response.players?.[0] || null;

      if (!summary) {
        console.warn(`[SteamService] No player summary found for ${steamId}`);
        return null;
      }

      await CacheService.set(cacheKey, summary, 3600, 'steam');
      return summary;
    } catch (error: any) {
      console.error(`[SteamService] Failed to fetch player summary for ${steamId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get player stats for a specific game.
   * Returns achievement progress, hours played, and other game-specific stats.
   *
   * @param steamId - The target Steam user ID
   * @param appId - Steam app ID (game ID)
   * @returns Player stats object or null if unavailable or profile is private
   *
   * Errors:
   * - 403: Profile is private
   * - 404: Game not found or no stats available
   */
  static async getPlayerStats(steamId: string, appId: number) {
    if (!steamId) throw new Error('steamId is required');
    if (!appId || appId <= 0) throw new Error('Valid appId is required');

    const cacheKey = `steam:stats:${steamId}:${appId}`;
    const cached = await CacheService.get<unknown>(cacheKey);
    if (cached) {
      console.log(`[SteamService] Player stats cache hit for ${steamId}, appid: ${appId}`);
      return cached;
    }

    console.log(`[SteamService] Fetching player stats for steamId: ${steamId}, appid: ${appId}`);
    const url = `${STEAM_BASE}/ISteamUserStats/GetUserStatsForGame/v0002/?key=${this.key}&steamid=${steamId}&appid=${appId}&format=json`;

    try {
      const { data } = await axios.get(url, { timeout: 10000 });

      // Check for error response
      if (data.playerstats?.error) {
        console.warn(`[SteamService] Stats error for ${steamId}, appid: ${appId}: ${data.playerstats.error}`);
        return null;
      }

      const stats = data.playerstats || null;

      if (!stats) {
        console.warn(`[SteamService] No stats found for ${steamId}, appid: ${appId}`);
        return null;
      }

      await CacheService.set(cacheKey, stats, 3600, 'steam');
      console.log(`[SteamService] Fetched stats for ${steamId}, appid: ${appId}`);
      return stats;
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.warn(`[SteamService] Profile for ${steamId} is private (403)`);
        throw new Error('403: Profile is private');
      } else if (error.response?.status === 404) {
        console.warn(`[SteamService] Game not found for appid: ${appId}`);
        throw new Error('404: Game not found or no stats available');
      } else if (error.response?.status === 401) {
        console.error('[SteamService] API Key invalid');
        throw new Error('401: API Key invalid');
      }
      console.error(`[SteamService] Failed to fetch player stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * NOTE: Store API is public; does not need API Key.
   *
   * @param appId - Steam app ID (e.g., 570 for Dota 2)
   * @returns Game details or null
   */
  static async getAppDetails(appId: number) {
    if (!appId || appId <= 0) throw new Error('Valid appId is required');

    const cacheKey = `steam:app:${appId}`;
    const cached = await CacheService.get<unknown>(cacheKey);
    if (cached) {
      console.log(`[SteamService] App details cache hit for ${appId}`);
      return cached;
    }

    console.log(`[SteamService] Fetching app details for appId: ${appId}`);
    const url = `${STORE_BASE}/appdetails?appids=${appId}`;

    try {
      const { data } = await axios.get(url, { timeout: 10000 });
      const payload = data?.[appId]?.data || null;

      if (payload) {
        await CacheService.set(cacheKey, payload, 86400, 'steam');
      }
      return payload;
    } catch (error: any) {
      console.warn(`[SteamService] Failed to fetch app details for ${appId}: ${error.message}`);
      return null;
    }
  }
}
