import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { SyncService } from '../services/sync-service';

// Default user ID for demo/unauthenticated mode
const DEFAULT_USER_ID = 'default-user';

export const ProfileController = {
  me: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id || DEFAULT_USER_ID;
    let user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true, apiTokens: true } });
    
    // Create user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@steamstats.local`,
          passwordHash: 'demo',
          profile: { create: { displayName: 'User' } }
        },
        include: { profile: true, apiTokens: true }
      });
    }
    
    res.json({ ...user?.profile, apiKeys: user?.apiTokens });
  },
  update: async (req: AuthRequest, res: Response) => {
    const data = req.body;
    const userId = req.user?.id || DEFAULT_USER_ID;
    console.log(`[Profile] Updating profile for user: ${userId}`);
    
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.favoriteGames !== undefined && { favoriteGames: JSON.stringify(data.favoriteGames) }),
        ...(data.visibility !== undefined && { visibility: data.visibility })
      },
      create: {
        userId,
        displayName: data.displayName || req.user?.email || 'User',
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        favoriteGames: JSON.stringify(data.favoriteGames || []),
        visibility: data.visibility || 'PUBLIC'
      }
    });

    if (data.apiKeys) {
      await prisma.apiToken.upsert({
        where: { userId },
        update: {
          steamKey: data.apiKeys.steamKey,
          steamId: data.apiKeys.steamId,
          igdbClientId: data.apiKeys.igdbClientId,
          igdbClientSecret: data.apiKeys.igdbClientSecret
        },
        create: {
          userId,
          steamKey: data.apiKeys.steamKey,
          steamId: data.apiKeys.steamId,
          igdbClientId: data.apiKeys.igdbClientId,
          igdbClientSecret: data.apiKeys.igdbClientSecret
        }
      });

      // Trigger Steam sync immediately after saving tokens
      if (data.apiKeys.steamKey && data.apiKeys.steamId) {
        try {
          await SyncService.syncSteam(userId);
        } catch (err) {
          console.error('Failed to sync Steam library:', err);
        }
      }
    }

    res.json(profile);
  }
};
