import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { SyncService } from '../services/sync-service';
import { SteamService } from '../services/steam-service';

// Default user ID for demo/unauthenticated mode
const DEFAULT_USER_ID = 'default-user';

export const ProfileController = {
  me: async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id || DEFAULT_USER_ID;
    const steamIdFromToken = req.user?.steamId; // Get steamId from JWT token
    
    console.log(`[Profile.me] userId: ${userId}, steamIdFromToken: ${steamIdFromToken}`);
    
    let user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true, apiTokens: true } });
    
    // Create or update user if doesn't exist
    if (!user) {
      // Try to fetch Steam data for display name
      let displayName = 'User';
      let avatarUrl = null;
      
      if (steamIdFromToken) {
        try {
          const steamSummary = await SteamService.getPlayerSummaries(steamIdFromToken);
          if (steamSummary?.personaname) {
            displayName = steamSummary.personaname;
            avatarUrl = steamSummary.avatarfull || steamSummary.avatarmedium || null;
          }
        } catch (err) {
          console.warn('[Profile.me] Could not fetch Steam data during user creation:', (err as Error).message);
        }
      }
      
      try {
        user = await prisma.user.create({
          data: {
            id: userId,
            email: `${userId}@steamstats.local`,
            passwordHash: 'demo',
            profile: { create: { displayName, avatarUrl } }
          },
          include: { profile: true, apiTokens: true }
        });
      } catch (err: any) {
        // If user already exists (duplicate email), fetch it
        if (err.code === 'P2002') {
          console.warn('[Profile.me] User already exists, fetching:', userId);
          user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true, apiTokens: true } });
        } else {
          throw err;
        }
      }
    }
    
    // Start with current profile
    let profile = user?.profile || { displayName: 'User', userId, visibility: 'PUBLIC', favoriteGames: [], avatarUrl: null, bio: null };
    
    // Try to fetch fresh Steam data using steamId from JWT token or database
    const steamId = steamIdFromToken || user?.apiTokens?.steamId;
    if (steamId) {
      try {
        console.log(`[Profile] Fetching Steam data for steamId: ${steamId}`);
        const steamSummary = await SteamService.getPlayerSummaries(steamId);
        if (steamSummary?.personaname) {
          console.log(`[Profile] Got Steam nickname: ${steamSummary.personaname}`);
          profile = {
            ...profile,
            displayName: steamSummary.personaname,
            avatarUrl: steamSummary.avatarfull || steamSummary.avatarmedium || profile.avatarUrl || null
          };
        }
      } catch (err) {
        console.warn('[Profile] Could not fetch fresh Steam data:', (err as Error).message);
        // Fall back to database profile
      }
    } else {
      console.warn('[Profile] No steamId found in token or database');
    }
    
    // Parse favoriteGames if it's a string
    if (typeof profile.favoriteGames === 'string') {
      try {
        profile.favoriteGames = JSON.parse(profile.favoriteGames);
      } catch {
        profile.favoriteGames = [];
      }
    }
    
    console.log(`[Profile.me] Returning profile with displayName: ${profile.displayName}`);
    res.json({ ...profile, apiKeys: user?.apiTokens });
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
