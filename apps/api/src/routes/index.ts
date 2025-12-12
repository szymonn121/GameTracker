import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { authMiddleware } from '../middleware/auth';
import { DashboardController } from '../controllers/dashboard-controller';
import { GamesController } from '../controllers/games-controller';
import { FriendsController } from '../controllers/friends-controller';
import { MatchmakingController } from '../controllers/matchmaking-controller';
import { ProfileController } from '../controllers/profile-controller';
import { SteamAuth } from '../auth/steam-openid';
import { signToken } from '../utils/jwt';
import { prisma } from '../db';
import { config } from '../config';

export const router = Router();

const steamAuth = new SteamAuth(config.apiUrl, `${config.apiUrl}/auth/steam/return`);

router.get('/', (_req, res) => res.json({ message: 'SteamStats API', status: 'ok' }));
router.get('/health', (_req, res) => res.json({ ok: true }));

router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);

// Steam OpenID
/**
 * Step 1: Redirect user to Steam OpenID
 * No authentication or API Key needed; Steam handles the authentication flow
 */
router.get('/auth/steam', (_req, res) => {
  console.log('[Auth] Redirecting to Steam OpenID');
  const redirectUrl = steamAuth.getRedirectUrl();
  res.redirect(redirectUrl);
});

/**
 * Step 2: Handle Steam OpenID callback
 *
 * Flow:
 * 1. Validate OpenID response and extract steamid64
 * 2. Create or find user in DB (indexed by steamId)
 * 3. Fetch fresh profile data using server's global API Key (background, non-blocking)
 * 4. Create JWT token with userId + steamId
 * 5. Redirect frontend to auth callback with token
 * 6. Start background data sync (games, stats, etc.)
 */
router.get('/auth/steam/return', async (req, res) => {
  try {
    // Step 1: Verify OpenID response and extract steamid
    const steamId = await steamAuth.verifyAssertion(req.query as Record<string, string>);

    if (!steamId || !steamId.match(/^\d+$/)) {
      console.error('[Auth] OpenID verification failed or invalid steamId:', steamId);
      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${redirectUrl}/login?error=invalid_steamid`);
    }

    console.log(`[Auth] ✓ Verified steamId64: ${steamId}`);

    // Step 2: Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { apiTokens: { steamId } },
          { email: `${steamId}@steam.local` }
        ]
      },
      include: { apiTokens: true, profile: true }
    });

    if (!user) {
      console.log(`[Auth] Creating new user for steamId: ${steamId}`);
      try {
        user = await prisma.user.create({
          data: {
            email: `${steamId}@steam.local`,
            passwordHash: '', // Steam users don't have passwords
            profile: {
              create: {
                displayName: `Player_${steamId.slice(-6)}`,
                avatarUrl: null
              }
            },
            apiTokens: {
              create: { steamId } // Store the steamId for later API calls
            }
          },
          include: { apiTokens: true, profile: true }
        });
      } catch (createErr) {
        console.error('[Auth] Failed to create user:', (createErr as Error).message);
        const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${redirectUrl}/login?error=user_creation_failed`);
      }
    } else {
      console.log(`[Auth] Existing user found for steamId: ${steamId}`);
    }

    if (!user) throw new Error('User not found after creation');

    // Step 3: Fetch fresh profile from Steam API using server's global key (background)
    (async () => {
      try {
        const { SteamService } = await import('../services/steam-service');
        const summary = await SteamService.getPlayerSummaries(steamId);

        if (summary && summary.personaname) {
          console.log(`[Auth] Updating profile: "${summary.personaname}" avatar from Steam`);
          await prisma.userProfile.update({
            where: { userId: user.id },
            data: {
              displayName: summary.personaname,
              avatarUrl: summary.avatarfull || summary.avatarmedium || null
            }
          }).catch(err => console.warn('[Auth] Profile update failed:', (err as Error).message));
        }
      } catch (err) {
        console.warn('[Auth] Could not fetch Steam profile (non-blocking):', (err as Error).message);
      }
    })();

    // Step 4: Create JWT token (proves authentication, contains userId + steamId for API calls)
    const token = signToken({ userId: user.id, email: user.email, steamId });
    console.log(`[Auth] JWT created for userId: ${user.id}`);

    // Step 5: Start background data sync (fetch games, generate dump, import)
    (async () => {
      try {
        const { DumpService } = await import('../services/dump-service');
        const { SyncService } = await import('../services/sync-service');

        console.log(`[Auth] Starting background sync for userId: ${user.id}, steamId: ${steamId}`);
        const dumpPath = await DumpService.generateDump(steamId, user.id);

        if (dumpPath) {
          console.log(`[Auth] ✓ Dump created: ${dumpPath}`);
          await SyncService.importDump(user.id);
          console.log(`[Auth] ✓ Games synced to database`);
        }
      } catch (syncErr) {
        console.warn('[Auth] Background sync failed (non-blocking):', (syncErr as Error).message);
      }
    })();

    // Step 6: Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    console.log(`[Auth] ✓ Login successful: userId=${user.id}, steamId=${steamId}`);
    res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`);

  } catch (error) {
    console.error('[Auth] Unexpected error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login?error=server_error`);
  }
});

/**
 * Get current logged-in user profile
 *
 * Endpoint: GET /auth/me
 * Auth: Required (JWT token in Authorization header)
 *
 * Returns:
 * - steamId: The user's Steam ID
 * - avatar: Avatar URL from Steam (or DB fallback)
 * - nickname: Display name from Steam (or DB fallback)
 * - profileUrl: Steam community profile URL
 * - games: List of owned games from Steam API
 *
 * Flow:
 * 1. Validate JWT token (authMiddleware extracts userId + steamId)
 * 2. Look up user profile in database
 * 3. Fetch fresh data from Steam API using server's global key
 * 4. Return combined data (Steam API fresh + DB cache fallback)
 *
 * Error Handling:
 * - Private profile: Returns empty games array with cached profile
 * - API Key invalid: Uses cached profile, returns empty games
 * - User not found: 404 error
 */
router.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const steamId = req.user?.steamId;

    if (!userId || !steamId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch user profile from DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[Auth Me] Fetching profile for userId: ${userId}, steamId: ${steamId}`);

    // Fetch fresh data from Steam API (using server's global key)
    let playerSummary = null;
    let ownedGames = null;

    try {
      const { SteamService } = await import('../services/steam-service');
      [playerSummary, ownedGames] = await Promise.all([
        SteamService.getPlayerSummaries(steamId).catch((err: any) => {
          console.warn('[Auth Me] Could not fetch player summary:', err.message);
          return null;
        }),
        SteamService.getOwnedGames(steamId).catch((err: any) => {
          console.warn('[Auth Me] Could not fetch owned games (profile may be private):', err.message);
          return null;
        })
      ]);
    } catch (steamErr) {
      console.warn('[Auth Me] Steam API error:', (steamErr as Error).message);
    }

    // Use Steam data if available, otherwise fallback to cached DB data
    const response = {
      steamId,
      avatar: playerSummary?.avatarfull || playerSummary?.avatarmedium || user.profile?.avatarUrl || null,
      nickname: playerSummary?.personaname || user.profile?.displayName || 'Player',
      profileUrl: playerSummary?.profileurl || null,
      games: ownedGames?.games?.map((g: any) => ({
        appid: g.appid,
        name: g.name,
        playtime_forever: g.playtime_forever || 0,
        playtime_hours: Math.round((g.playtime_forever || 0) / 60 * 10) / 10,
        img_icon_url: g.img_icon_url || null,
        img_logo_url: g.img_logo_url || null
      })) || []
    };

    console.log(`[Auth Me] Returning profile with ${response.games.length} games`);
    res.json(response);

  } catch (error) {
    console.error('[Auth Me] Error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile', details: (error as Error).message });
  }
});

/**
 * Get stats for logged-in user for a specific game
 *
 * Endpoint: GET /api/stats/:appid
 * Auth: Required (JWT token in Authorization header)
 *
 * Returns: Player stats for the game (if public profile and game has stats)
 *
 * Usage: Fetch user's achievement progress, hours played, etc. for a specific game
 *
 * Error Handling:
 * - Private profile: 403 error
 * - Game not found: 404 error
 * - Stats unavailable: Returns empty/partial stats
 */
router.get('/api/stats/:appid', authMiddleware, async (req, res) => {
  try {
    const steamId = req.user?.steamId;
    const appId = req.params.appid;

    if (!steamId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!appId || !appId.match(/^\d+$/)) {
      return res.status(400).json({ error: 'Invalid appid' });
    }

    console.log(`[Stats] Fetching stats for steamId: ${steamId}, appid: ${appId}`);

    try {
      const { SteamService } = await import('../services/steam-service');

      // Fetch player stats using server's global API key
      const stats = await SteamService.getPlayerStats(steamId, parseInt(appId));

      if (!stats) {
        console.warn(`[Stats] No stats available for steamId: ${steamId}, appid: ${appId}`);
        return res.status(404).json({ error: 'Stats not found or profile is private' });
      }

      res.json(stats);
    } catch (steamErr) {
      console.error('[Stats] Steam API error:', (steamErr as Error).message);
      const message = (steamErr as Error).message;

      if (message.includes('403')) {
        return res.status(403).json({ error: 'Profile is private' });
      }
      if (message.includes('404')) {
        return res.status(404).json({ error: 'Game not found or no stats available' });
      }

      res.status(500).json({ error: 'Failed to fetch stats', details: message });
    }
  } catch (error) {
    console.error('[Stats] Error:', error);
    res.status(500).json({ error: 'Server error', details: (error as Error).message });
  }
});

/**
 * DEPRECATED: Use /auth/me instead for user info
 * Temporarily public for demo (remove authMiddleware)
 * Require auth for dashboard to ensure per-user isolation
 */
router.get('/dashboard', authMiddleware, DashboardController.get);
router.get('/profile', ProfileController.me);
router.put('/profile', ProfileController.update);

router.get('/games', GamesController.list);
router.get('/games/:id', GamesController.detail);

router.get('/friends', FriendsController.list);
router.get('/friends/requests', FriendsController.sendRequest);
router.post('/friends/requests', FriendsController.request);
router.post('/friends/accept/:id', FriendsController.accept);
router.delete('/friends/:friendId', FriendsController.remove);

router.get('/matchmaking/recommendations', MatchmakingController.recommend);

// Manual trigger to import dump into DB and return counts
router.post('/sync/import', async (req, res) => {
  try {
    const { SyncService } = await import('../services/sync-service');
    // Determine user: from query param, auth, or latest created
    let userId = (req.query.userId as string) || req.user?.id;
    if (!userId) {
      const latest = await prisma.user.findFirst({ orderBy: { createdAt: 'desc' } });
      userId = latest?.id;
    }
    if (!userId) return res.status(400).json({ error: 'No user available to import into' });
    console.log(`[Routes] /sync/import starting for userId=${userId}`);
    const result = await SyncService.importDump(userId);
    const [u, g, ug] = await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.userGame.count(),
    ]);
    res.json({ ok: true, import: result, counts: { users: u, games: g, userGames: ug } });
  } catch (err) {
    console.error('[Routes] /sync/import failed:', (err as Error).message);
    res.status(500).json({ error: 'Import failed', details: (err as Error).message });
  }
});
