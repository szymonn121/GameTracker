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
    const monthlyAggregate: Record<string, number> = {};
    for (const ug of user.userGames) {
      if (!ug.playtimeByMonth) continue;
      try {
        const parsed = typeof ug.playtimeByMonth === 'string' ? JSON.parse(ug.playtimeByMonth) : ug.playtimeByMonth;
        if (parsed && typeof parsed === 'object') {
          for (const [month, hours] of Object.entries(parsed as Record<string, number>)) {
            monthlyAggregate[month] = (monthlyAggregate[month] ?? 0) + (Number(hours) || 0);
          }
        }
      } catch (err) {
        console.warn('[Dashboard] Failed to parse playtimeByMonth for userGame:', err);
      }
    }

    // Build last 12 months chronologically (oldest first) to feed the chart
    const now = new Date();
    const monthKeys = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - i), 1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    });

    const monthlyHours = monthKeys.map((key) => ({ 
      month: key, 
      hours: Math.round((monthlyAggregate[key] ?? 0) * 10) / 10  // Round to 1 decimal place
    }));

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
