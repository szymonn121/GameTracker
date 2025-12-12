import { prisma } from '../db';
import { SyncService } from './sync-service';

export class DashboardService {
  static async getDashboard(userId: string) {
    // Create user if doesn't exist (should normally exist after Steam auth)
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
    const totalHours = user.userGames.reduce((sum, ug) => sum + ug.hours, 0);
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
    
    // Get top 5 most played games from database
    const topGenres = userGamesAll
      .filter((ug) => ug.game && ug.game.name)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)
      .map((ug) => ({ genre: ug.game!.name, hours: Math.round(ug.hours) }));

    const userGamesRecent = await prisma.userGame.findMany({
      where: { userId },
      orderBy: { lastPlayed: 'desc' },
      take: 10,
      include: { game: true }
    });
    const recentGames = userGamesRecent
      .filter(ug => ug.game && ug.game.name && !ug.game.name.startsWith('Game '))
      .slice(0, 5)
      .map(ug => ({
        id: ug.game.id,
        name: ug.game.name,
        genres: typeof ug.game.genres === 'string' ? JSON.parse(ug.game.genres) : ug.game.genres || []
      }));

    const recommendations = await prisma.gameSimilarityCache.findMany({ take: 5 });

    console.log(`[Dashboard] Loaded for user ${userId}: ${userGamesAll.length} games, ${totalHours} hours`);
    return {
      playtime: { totalHours, monthlyHours, topGenres, recentGames },
      recommendations: recommendations.map((r) => ({ game: { id: r.similarToId, name: r.similarToId }, score: r.score, reasons: r.reasons })),
      activity: user.activity.slice(0, 10)
    };
  }
}
