import { prisma } from '../db';
import { SyncService } from './sync-service';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class DashboardService {
  static async getDashboard(userId: string) {
    // Create user if doesn't exist
    let user = await prisma.user.findUnique({ where: { id: userId }, include: { userGames: true, activity: true } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@steamstats.local`,
          passwordHash: 'demo',
          profile: { create: { displayName: 'User' } }
        },
        include: { userGames: true, activity: true }
      });
    }

    // Try to sync, but don't block if Steam API fails
    try {
      await SyncService.syncSteam(userId);
    } catch (syncError) {
      console.warn('[Dashboard] Sync failed (non-blocking):', (syncError as Error).message);
    }

    user = await prisma.user.findUnique({ where: { id: userId }, include: { userGames: true, activity: true } });
    if (!user) throw new Error('User not found');

    // Compute metrics from DB
    let totalHours = user.userGames.reduce((sum, ug) => sum + ug.hours, 0);
    
    // If DB is empty, try to load total from dump
    if (totalHours === 0) {
      const dumpPath = path.resolve(__dirname, '../../../../steam_dump.json');
      if (fs.existsSync(dumpPath)) {
        try {
          const raw = fs.readFileSync(dumpPath, 'utf-8');
          const dump = JSON.parse(raw) as { totals?: { playtime_hours?: number } };
          totalHours = dump.totals?.playtime_hours || 0;
          console.log(`[Dashboard] Loaded total hours from dump: ${totalHours}`);
        } catch (e) {
          console.warn('[Dashboard] Failed to read dump for total hours:', (e as Error).message);
        }
      }
    }
    const monthlyHours = user.userGames
      .flatMap((ug) => {
        const data = typeof ug.playtimeByMonth === 'string' ? JSON.parse(ug.playtimeByMonth) : (ug.playtimeByMonth as unknown[] | undefined);
        return Array.isArray(data) ? data : [];
      })
      .slice(0, 12)
      .map((entry: unknown) => {
        const e = entry as { month: string; hours: number };
        return { month: e.month, hours: e.hours };
      });

    // Repurpose "topGenres" to carry most played games (name + hours)
    const userGamesAll = await prisma.userGame.findMany({ where: { userId }, include: { game: true } });
    
    // If DB is empty, try to load from dump
    let topGenres = userGamesAll
      .filter((ug) => ug.game && ug.game.name)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)
      .map((ug) => ({ genre: ug.game!.name, hours: Math.round(ug.hours) }));

    if (topGenres.length === 0) {
      // Try to load from dump
      const dumpPath = path.resolve(__dirname, '../../../../steam_dump.json');
      if (fs.existsSync(dumpPath)) {
        try {
          const raw = fs.readFileSync(dumpPath, 'utf-8');
          const dump = JSON.parse(raw) as {
            owned_games?: Array<{ appid: number; name?: string; playtime_forever_min?: number }>;
          };
          topGenres = (dump.owned_games || [])
            .sort((a, b) => (b.playtime_forever_min || 0) - (a.playtime_forever_min || 0))
            .slice(0, 5)
            .map((g) => ({ genre: g.name || `Game ${g.appid}`, hours: Math.round((g.playtime_forever_min || 0) / 60) }));
          console.log(`[Dashboard] Loaded ${topGenres.length} top games from dump`);
        } catch (e) {
          console.warn('[Dashboard] Failed to read dump:', (e as Error).message);
        }
      }
    }

    const userGamesRecent = await prisma.userGame.findMany({
      where: { userId },
      orderBy: { lastPlayed: 'desc' },
      take: 10,
      include: { game: true }
    });
    let recentGames = userGamesRecent
      .filter(ug => ug.game && ug.game.name && !ug.game.name.startsWith('Game '))
      .slice(0, 5)
      .map(ug => ({
        id: ug.game.id,
        name: ug.game.name,
        genres: typeof ug.game.genres === 'string' ? JSON.parse(ug.game.genres) : ug.game.genres || []
      }));

    // If no recent games in DB, try to load from dump
    if (recentGames.length === 0) {
      const dumpPath = path.resolve(__dirname, '../../../../steam_dump.json');
      if (fs.existsSync(dumpPath)) {
        try {
          const raw = fs.readFileSync(dumpPath, 'utf-8');
          const dump = JSON.parse(raw) as {
            recently_played?: Array<{ appid: number; name?: string; playtime_2weeks?: number }>;
          };
          recentGames = (dump.recently_played || [])
            .filter((g) => (g.playtime_2weeks || 0) > 0)
            .slice(0, 5)
            .map((g) => ({
              id: `steam:${g.appid}`,
              name: g.name || `Game ${g.appid}`,
              genres: []
            }));
          console.log(`[Dashboard] Loaded ${recentGames.length} recent games from dump`);
        } catch (e) {
          console.warn('[Dashboard] Failed to read dump for recent games:', (e as Error).message);
        }
      }
    }

    const recommendations = await prisma.gameSimilarityCache.findMany({ take: 5 });

    console.log(`[Dashboard] Loaded for user ${userId}: ${userGamesAll.length} games, ${totalHours} hours`);
    return {
      playtime: { totalHours, monthlyHours, topGenres, recentGames },
      recommendations: recommendations.map((r) => ({ game: { id: r.similarToId, name: r.similarToId }, score: r.score, reasons: r.reasons })),
      activity: user.activity.slice(0, 10)
    };
  }
}
