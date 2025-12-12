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
      await prisma.userGame.upsert({
        where: { userId_gameId: { userId, gameId } },
        update: { hours: g.playtime_forever / 60, lastPlayed: g.rtime_last_played ? new Date(g.rtime_last_played * 1000) : undefined },
        create: {
          userId,
          gameId,
          hours: g.playtime_forever / 60,
          lastPlayed: g.rtime_last_played ? new Date(g.rtime_last_played * 1000) : undefined,
          playtimeByMonth: JSON.stringify({})
        }
      });
    }
    console.log(`[SyncService] Sync complete for user ${userId}`);
  }


}
