import { prisma } from '../db';

const parseStringArray = (value?: string | null) => {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as string[];
  }
};

export class MatchmakingService {
  static async suggest(userId: string) {
    const userGames = await prisma.userGame.findMany({ where: { userId } });
    const genreCounts: Record<string, number> = {};
    for (const ug of userGames) {
      const game = await prisma.game.findUnique({ where: { id: ug.gameId } });
      parseStringArray(game?.genres).forEach((g) => {
        genreCounts[g] = (genreCounts[g] || 0) + ug.hours;
      });
    }

    const candidates = await prisma.user.findMany({
      where: { id: { not: userId } },
      include: { userGames: true, profile: true }
    });

    return candidates
      .map((cand) => {
        const overlapGames = cand.userGames.filter((g) => userGames.some((u) => u.gameId === g.gameId));
        const overlapHours = overlapGames.reduce((sum, g) => sum + g.hours, 0);
        const score = overlapHours + overlapGames.length * 5;
        return {
          userId: cand.id,
          displayName: cand.profile?.displayName || cand.email,
          score,
          reasons: [`${overlapGames.length} shared games`, `${overlapHours.toFixed(1)}h overlap`]
        };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
}
