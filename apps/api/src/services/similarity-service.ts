import { Game } from '@prisma/client';
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

interface SimilarityResult {
  gameId: string;
  similarToId: string;
  score: number;
  reasons: string[];
}

export class SimilarityService {
  static scoreGame(a: Game, b: Game): SimilarityResult {
    let score = 0;
    const reasons: string[] = [];

    const genresA = parseStringArray(a.genres);
    const genresB = parseStringArray(b.genres);
    const genreOverlap = genresA.filter((g: string) => genresB.includes(g));
    if (genreOverlap.length) {
      score += genreOverlap.length * 5;
      reasons.push(`Genres: ${genreOverlap.join(', ')}`);
    }

    const tagsA = parseStringArray(a.tags);
    const tagsB = parseStringArray(b.tags);
    const tagOverlap = tagsA.filter((t: string) => tagsB.includes(t));
    if (tagOverlap.length) {
      score += tagOverlap.length * 3;
      reasons.push(`Tags: ${tagOverlap.join(', ')}`);
    }

    if (a.rating && b.rating) {
      const diff = Math.abs(a.rating - b.rating);
      score += Math.max(0, 10 - diff);
    }

    return { gameId: a.id, similarToId: b.id, score, reasons };
  }

  static async buildCacheFor(gameId: string) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return [];
    const others = await prisma.game.findMany({ where: { id: { not: gameId } } });
    const scored = others
      .map((g: Game) => this.scoreGame(game, g))
      .filter((s: SimilarityResult) => s.score > 0)
      .sort((a: SimilarityResult, b: SimilarityResult) => b.score - a.score)
      .slice(0, 10);

    await prisma.gameSimilarityCache.deleteMany({ where: { gameId } });
    await prisma.gameSimilarityCache.createMany({
      data: scored.map((s: SimilarityResult) => ({
        gameId: s.gameId,
        similarToId: s.similarToId,
        score: s.score,
        reasons: JSON.stringify(s.reasons)
      }))
    });
    return scored;
  }

  static async getSimilar(gameId: string) {
    const cached = await prisma.gameSimilarityCache.findMany({ where: { gameId }, take: 10, orderBy: { score: 'desc' } });
    if (cached.length) return cached;
    return this.buildCacheFor(gameId);
  }
}
