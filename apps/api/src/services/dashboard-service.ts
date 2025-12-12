import { prisma } from '../db';
import { SyncService } from './sync-service';

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

    // Only seed demo data if explicitly no Steam ID exists
    const tokens = await prisma.apiToken.findUnique({ where: { userId } });
    const hasSteamId = !!tokens?.steamId;
    
    if (user.userGames.length === 0 && !hasSteamId) {
      console.log(`[Dashboard] No games and no Steam ID, seeding demo data for user ${userId}`);
      await DashboardService.seedDemoData(userId);
      user = await prisma.user.findUnique({ where: { id: userId }, include: { userGames: true, activity: true } });
      if (!user) throw new Error('User not found after seeding');
    }

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

    const genreHours: Record<string, number> = {};
    for (const ug of user.userGames) {
      const game = await prisma.game.findUnique({ where: { id: ug.gameId } });
      const genres = typeof game?.genres === 'string' ? JSON.parse(game.genres) : game?.genres || [];
      (genres as string[]).forEach((g) => {
        genreHours[g] = (genreHours[g] || 0) + ug.hours;
      });
    }
    const topGenres = Object.entries(genreHours)
      .map(([genre, hours]) => ({ genre, hours: Math.round(hours) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);

    const userGamesRecent = await prisma.userGame.findMany({
      where: { userId },
      orderBy: { lastPlayed: 'desc' },
      take: 10, // Get more to filter out placeholders
      include: { game: true }
    });
    const recentGames = userGamesRecent
      .filter(ug => ug.game && ug.game.name && !ug.game.name.startsWith('Game ')) // Filter out placeholder games
      .slice(0, 5) // Take only 5 after filtering
      .map(ug => ({
        id: ug.game.id,
        name: ug.game.name,
        genres: typeof ug.game.genres === 'string' ? JSON.parse(ug.game.genres) : ug.game.genres || []
      }));

    const recommendations = await prisma.gameSimilarityCache.findMany({ take: 5 });

    return {
      playtime: { totalHours, monthlyHours, topGenres, recentGames },
      recommendations: recommendations.map((r) => ({ game: { id: r.similarToId, name: r.similarToId }, score: r.score, reasons: r.reasons })),
      activity: user.activity.slice(0, 10)
    };
  }

  private static async seedDemoData(userId: string) {
    const demoGames = [
      {
        id: 'demo:elden-ring',
        name: 'Elden Ring',
        genres: ['Action', 'RPG'],
        tags: ['Soulslike', 'Open World'],
        summary: 'Explore the Lands Between in FromSoftware\'s open-world adventure.',
        rating: 95,
        hours: 120,
        lastPlayedOffsetDays: 2
      },
      {
        id: 'demo:helldivers2',
        name: 'Helldivers 2',
        genres: ['Shooter', 'Co-op'],
        tags: ['Co-op', 'Sci-Fi'],
        summary: 'Squad up and spread managed democracy across the galaxy.',
        rating: 88,
        hours: 45,
        lastPlayedOffsetDays: 5
      },
      {
        id: 'demo:balatro',
        name: 'Balatro',
        genres: ['Roguelike', 'Card Game'],
        tags: ['Deckbuilder'],
        summary: 'Build busted poker hands in this roguelike deckbuilder.',
        rating: 92,
        hours: 32,
        lastPlayedOffsetDays: 9
      },
      {
        id: 'demo:hades2',
        name: 'Hades II',
        genres: ['Roguelike', 'Action'],
        tags: ['Indie', 'Fast-Paced'],
        summary: 'Descend into the underworld as Melinoë to battle Chronos.',
        rating: 93,
        hours: 28,
        lastPlayedOffsetDays: 12
      }
    ];

    for (const g of demoGames) {
      await prisma.game.upsert({
        where: { id: g.id },
        update: {
          name: g.name,
          genres: JSON.stringify(g.genres),
          tags: JSON.stringify(g.tags),
          summary: g.summary,
          rating: g.rating,
          coverUrl: `https://via.placeholder.com/256x256.png?text=${encodeURIComponent(g.name)}`
        },
        create: {
          id: g.id,
          name: g.name,
          genres: JSON.stringify(g.genres),
          tags: JSON.stringify(g.tags),
          summary: g.summary,
          rating: g.rating,
          coverUrl: `https://via.placeholder.com/256x256.png?text=${encodeURIComponent(g.name)}`
        }
      });

      await prisma.userGame.upsert({
        where: { userId_gameId: { userId, gameId: g.id } },
        update: {
          hours: g.hours,
          lastPlayed: new Date(Date.now() - g.lastPlayedOffsetDays * 24 * 60 * 60 * 1000),
          playtimeByMonth: JSON.stringify([
            { month: 'Oct', hours: Math.max(1, Math.round(g.hours * 0.2)) },
            { month: 'Nov', hours: Math.max(1, Math.round(g.hours * 0.35)) },
            { month: 'Dec', hours: Math.max(1, Math.round(g.hours * 0.45)) }
          ])
        },
        create: {
          userId,
          gameId: g.id,
          hours: g.hours,
          lastPlayed: new Date(Date.now() - g.lastPlayedOffsetDays * 24 * 60 * 60 * 1000),
          playtimeByMonth: JSON.stringify([
            { month: 'Oct', hours: Math.max(1, Math.round(g.hours * 0.2)) },
            { month: 'Nov', hours: Math.max(1, Math.round(g.hours * 0.35)) },
            { month: 'Dec', hours: Math.max(1, Math.round(g.hours * 0.45)) }
          ])
        }
      });
    }

    // Basic activity feed
    await prisma.activity.createMany({
      data: [
        { userId, type: 'PLAY', description: 'Played Elden Ring for 3 hours', metadata: JSON.stringify({ gameId: 'demo:elden-ring' }) },
        { userId, type: 'ACHIEVEMENT', description: 'Unlocked “Super Citizen” in Helldivers 2', metadata: JSON.stringify({ gameId: 'demo:helldivers2' }) },
        { userId, type: 'PLAY', description: 'Cleared a tough run in Hades II', metadata: JSON.stringify({ gameId: 'demo:hades2' }) }
      ]
    });
  }
}
