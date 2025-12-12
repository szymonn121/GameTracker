import axios from 'axios';
import { config } from '../config';
import { CacheService } from './cache-service';

const STEAM_BASE = 'https://api.steampowered.com';
const STORE_BASE = 'https://store.steampowered.com/api';

export class SteamService {
  private static key = config.steamApiKey;

  static async getOwnedGames(steamId: string, apiKey?: string) {
    const cacheKey = `steam:owned:${steamId}`;
    const cached = await CacheService.get<unknown>(cacheKey);
    if (cached) return cached;
    const key = apiKey || this.key;
    console.log(`[SteamService] Using API key: ${key?.substring(0, 8)}... for Steam ID: ${steamId}`);
    const url = `${STEAM_BASE}/IPlayerService/GetOwnedGames/v0001/?key=${key}&steamid=${steamId}&include_appinfo=true&include_played_free_games=1&format=json`;
    const { data } = await axios.get(url);
    await CacheService.set(cacheKey, data.response, 3600, 'steam');
    return data.response;
  }

  static async getRecentlyPlayed(steamId: string, apiKey?: string) {
    const cacheKey = `steam:recent:${steamId}`;
    const cached = await CacheService.get<unknown>(cacheKey);
    if (cached) return cached;
    const key = apiKey || this.key;
    const url = `${STEAM_BASE}/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${key}&steamid=${steamId}&format=json`;
    const { data } = await axios.get(url);
    await CacheService.set(cacheKey, data.response, 1800, 'steam');
    return data.response;
  }

  static async getPlayerSummaries(steamId: string, apiKey?: string) {
    const cacheKey = `steam:player:${steamId}`;
    const cached = await CacheService.get<unknown>(cacheKey);
    if (cached) return cached;
    const key = apiKey || this.key;
    console.log(`[SteamService] GetPlayerSummaries using API key: ${key?.substring(0, 8)}... for Steam ID: ${steamId}`);
    const url = `${STEAM_BASE}/ISteamUser/GetPlayerSummaries/v0002/?key=${key}&steamids=${steamId}`;
    const { data } = await axios.get(url);
    const summary = data.response.players?.[0];
    await CacheService.set(cacheKey, summary, 3600, 'steam');
    return summary;
  }

  static async getAppDetails(appId: number) {
    const cacheKey = `steam:app:${appId}`;
    const cached = await CacheService.get<unknown>(cacheKey);
    if (cached) return cached;
    const url = `${STORE_BASE}/appdetails?appids=${appId}`;
    const { data } = await axios.get(url);
    const payload = data?.[appId]?.data;
    await CacheService.set(cacheKey, payload, 86400, 'steam');
    return payload;
  }
}
