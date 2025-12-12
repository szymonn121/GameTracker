import { writeFile } from 'fs/promises';
import path from 'path';
import { SteamService } from './steam-service';
import { logger } from '../logger';

export class DumpService {
  static async generateDump(steamId: string) {
    try {
      const [profile, owned, recent] = await Promise.all([
        SteamService.getPlayerSummaries(steamId).catch(() => null),
        SteamService.getOwnedGames(steamId).catch(() => null),
        SteamService.getRecentlyPlayed(steamId).catch(() => null),
      ]);

      const dump = {
        steamId,
        profile: profile ? {
          personaname: profile.personaname,
          avatarfull: profile.avatarfull,
          avatarmedium: profile.avatarmedium,
          profileurl: profile.profileurl,
        } : null,
        owned_games: owned?.games?.map((g: any) => ({
          appid: g.appid,
          name: g.name,
          playtime_forever_min: g.playtime_forever,
          playtime_hours: Math.round((g.playtime_forever / 60) * 10) / 10,
          rtime_last_played: g.rtime_last_played || null,
          img_icon_url: g.img_icon_url,
          img_logo_url: g.img_logo_url,
        })) || [],
        recent_games: recent?.games?.map((g: any) => ({
          appid: g.appid,
          name: g.name,
          playtime_2weeks_min: g.playtime_2weeks,
          playtime_2weeks_hours: Math.round((g.playtime_2weeks / 60) * 10) / 10,
        })) || [],
        totals: {
          ownedCount: owned?.game_count || (owned?.games?.length ?? 0),
          totalHours: (owned?.games || []).reduce((acc: number, g: any) => acc + (g.playtime_forever / 60), 0),
        },
        generatedAt: new Date().toISOString(),
      };

      // Ensure dump is written to the workspace root (repo root)
      const dumpPath = path.resolve(__dirname, '../../../../steam_dump.json');

      // If Steam API returned no data, avoid overwriting an existing Python-generated dump
      const hasData = (dump.owned_games && dump.owned_games.length > 0) || (dump.recent_games && dump.recent_games.length > 0);
      if (!hasData) {
        logger.warn('[DumpService] No data from Steam API; preserving existing dump if present');
        return dumpPath;
      }

      await writeFile(dumpPath, JSON.stringify(dump, null, 2), 'utf-8');
      logger.info({ owned: dump.totals.ownedCount }, `[DumpService] Dump written to ${dumpPath}`);
      return dumpPath;
    } catch (err) {
      logger.warn(`[DumpService] Failed to generate dump: ${(err as Error).message}`);
      return null;
    }
  }
}
