import { prisma } from '../db';

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    const record = await prisma.apiCache.findUnique({ where: { key } });
    if (!record) return null;
    if (record.expiresAt < new Date()) return null;
    try {
      return JSON.parse(record.payload) as T;
    } catch {
      return record.payload as unknown as T;
    }
  }

  static async set(key: string, payload: unknown, ttlSeconds: number, source: string) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    await prisma.apiCache.upsert({
      where: { key },
      update: { payload: serialized, expiresAt, fetchedAt: new Date(), source },
      create: { key, payload: serialized, expiresAt, fetchedAt: new Date(), source }
    });
  }
}
