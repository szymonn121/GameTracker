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

  static async importDump(userId: string): Promise<{ parsed: number; imported: number; errors: string[]; dumpPath?: string }> {
    const result = { parsed: 0, imported: 0, errors: [] as string[] };
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      // Read per-user dump first, then global fallback
      const perUserDump = path.resolve(__dirname, `../../../../steam_dump_${userId}.json`);
      const globalDump = path.resolve(__dirname, '../../../../steam_dump.json');
      let dumpPath = perUserDump;
      let exists = await fs.access(dumpPath).then(() => true).catch(() => false);
      if (!exists) {
        dumpPath = globalDump;
        exists = await fs.access(dumpPath).then(() => true).catch(() => false);
      }
      result.dumpPath = dumpPath;
      console.log(`[SyncService] Looking for dump at: ${dumpPath}`);
      if (!exists) {
        result.errors.push(`No dump file found at ${dumpPath}`);
        console.log(`[SyncService] ${result.errors[0]}`);
        return result;
      }
      const raw = await fs.readFile(dumpPath, 'utf-8');
      const dump = JSON.parse(raw);
      console.log(`[SyncService] Dump loaded successfully, size: ${raw.length} bytes`);
      const steamId: string | undefined = dump?.steamId || dump?.steam_id;
      // Ensure user has token
      const user = await prisma.user.findUnique({ where: { id: userId }, include: { apiTokens: true } });
      if (user && !user.apiTokens && steamId) {
        await prisma.apiToken.create({ data: { userId, steamId } });
      }
      // Update profile
      if (dump?.profile) {
        await prisma.userProfile.upsert({
          where: { userId },
          update: {
            displayName: dump.profile.personaname || undefined,
            avatarUrl: dump.profile.avatarfull || dump.profile.avatarmedium || undefined,
          },
          create: {
            userId,
            displayName: dump.profile.personaname || 'Player',
            avatarUrl: dump.profile.avatarfull || dump.profile.avatarmedium || null,
          },
        });
      }
      // Import games (support multiple possible keys)
      const ownedArr = Array.isArray(dump?.owned_games)
        ? dump.owned_games
        : Array.isArray(dump?.owned)
        ? dump.owned
        : Array.isArray(dump?.games)
        ? dump.games
        : [];
      result.parsed = ownedArr.length;
      console.log(`[SyncService] Found ${ownedArr.length} games in dump. owned_games exists: ${!!dump?.owned_games}, length: ${dump?.owned_games?.length}`);
      for (const g of ownedArr) {
        try {
          const appid = Number(g.appid);
          if (!appid || appid <= 0) {
            result.errors.push(`Invalid appid for game: ${g.name}`);
            continue;
          }
          const gameId = `steam:${appid}`;
          let game = null;
          try {
            game = await GameService.upsertGameFromSteam(appid);
          } catch (storeErr) {
            console.warn(`[SyncService] Steam store fetch failed for ${appid} (${g.name}), creating minimal entry`);
          }
          if (!game) {
            game = await prisma.game.upsert({
              where: { id: gameId },
              update: { name: g.name || 'Unknown', steamAppId: appid },
              create: {
                id: gameId,
                name: g.name || 'Unknown',
                steamAppId: appid,
                genres: JSON.stringify([]),
                tags: JSON.stringify([]),
                screenshots: JSON.stringify([])
              }
            });
            console.log(`[SyncService] Created minimal game: ${g.name} (${appid})`);
          }
          const hours = Number(g.playtime_forever_min ?? g.playtime_forever ?? 0) / 60 || Number(g.playtime_hours ?? 0);
          await prisma.userGame.upsert({
            where: { userId_gameId: { userId, gameId } },
            update: {
              hours,
              lastPlayed: g.rtime_last_played ? new Date(g.rtime_last_played * 1000) : undefined,
              playtimeByMonth: JSON.stringify({}),
            },
            create: {
              userId,
              gameId,
              hours,
              lastPlayed: g.rtime_last_played ? new Date(g.rtime_last_played * 1000) : undefined,
              playtimeByMonth: JSON.stringify({}),
            },
          });
          result.imported++;
        } catch (gameErr) {
          result.errors.push(`Failed to import ${g.name}: ${(gameErr as Error).message}`);
          console.warn('[SyncService] Game import error:', (gameErr as Error).message);
        }
      }
      console.log(`[SyncService] Dump import complete: ${result.imported}/${result.parsed} games`);
    } catch (err) {
      result.errors.push(`Import failed: ${(err as Error).message}`);
      console.warn('[SyncService] Dump import failed:', (err as Error).message);
    }
    return result;
  }
}
