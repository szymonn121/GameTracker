import { prisma } from '../db';
import { SteamService } from './steam-service';
import { GameService } from './game-service';

export class SyncService {
  static async syncSteam(userId: string) {
    const tokens = await prisma.apiToken.findUnique({ where: { userId } });
    if (!tokens?.steamId) {
      console.log(`[SyncService] No Steam ID for user ${userId}`);
      return;
    }
    
    console.log(`[SyncService] Syncing Steam library for user ${userId}, Steam ID: ${tokens.steamId}`);
    
    // Use server's Steam API key (from config)
    const owned = await SteamService.getOwnedGames(tokens.steamId);
    if (!owned?.games) {
      console.log(`[SyncService] No games found for Steam ID ${tokens.steamId}`);
      return;
    }
    
    console.log(`[SyncService] Found ${owned.games.length} games, syncing...`);
    for (const g of owned.games) {
      const gameId = `steam:${g.appid}`;
      await GameService.upsertGameFromSteam(g.appid);

      const existing = await prisma.userGame.findUnique({ where: { userId_gameId: { userId, gameId } } });
      const previousHours = existing?.hours ?? 0;
      const newHours = g.playtime_forever / 60;
      const twoWeekHours = (g.playtime_2weeks ?? 0) / 60;

      // Build monthly map and attribute only the delta since last sync to the current month
      let playtimeByMonth: Record<string, number> = {};
      if (existing?.playtimeByMonth) {
        try {
          const parsed = JSON.parse(existing.playtimeByMonth as string);
          if (parsed && typeof parsed === 'object') {
            playtimeByMonth = Object.entries(parsed).reduce<Record<string, number>>((acc, [month, hours]) => {
              acc[month] = Number(hours) || 0;
              return acc;
            }, {});
          }
        } catch (err) {
          console.warn('[SyncService] Failed to parse playtimeByMonth, resetting map:', err);
        }
      }

      const now = new Date();
      const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
      const delta = newHours - previousHours;
      
      // On first sync with no existing data, use 2-week playtime if available (more accurate than total)
      if (!existing && twoWeekHours > 0) {
        playtimeByMonth[monthKey] = twoWeekHours;
      } else if (delta > 0) {
        playtimeByMonth[monthKey] = (playtimeByMonth[monthKey] ?? 0) + delta;
      }

      // Keep only the last 12 months of data
      const monthsToKeep = new Set(
        Array.from({ length: 12 }, (_, i) => {
          const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        })
      );
      Object.keys(playtimeByMonth).forEach((key) => {
        if (!monthsToKeep.has(key)) delete playtimeByMonth[key];
      });

      await prisma.userGame.upsert({
        where: { userId_gameId: { userId, gameId } },
        update: {
          hours: newHours,
          lastPlayed: g.rtime_last_played ? new Date(g.rtime_last_played * 1000) : undefined,
          playtimeByMonth: JSON.stringify(playtimeByMonth)
        },
        create: {
          userId,
          gameId,
          hours: newHours,
          lastPlayed: g.rtime_last_played ? new Date(g.rtime_last_played * 1000) : undefined,
          playtimeByMonth: JSON.stringify(playtimeByMonth)
        }
      });
    }
    console.log(`[SyncService] Sync complete for user ${userId}`);
  }


}
