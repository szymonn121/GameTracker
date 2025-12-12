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
 * 1. OpenID extracts steamid from Steam response
 * 2. Find or create user in our DB (indexed by steamId)
 * 3. Fetch profile data using the server's API Key (non-blocking)
 * 4. Create JWT token containing userId + steamId
 * 5. Redirect to frontend with token; frontend stores it for API auth
 */
router.get('/auth/steam/return', async (req, res) => {
  try {
    // Step 1: OpenID returns steamid (NOT API-authenticated; just extracted from Steam response)
    const steamId = await steamAuth.verifyAssertion(req.query as Record<string, string>);
    
    if (!steamId) {
      console.error('[Auth] OpenID verification failed');
      return res.redirect('http://localhost:3000/login?error=auth_failed');
    }

    console.log(`[Auth] ✓ Verified steamId: ${steamId}`);

    // Step 2: Find or create user in our database
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
      user = await prisma.user.create({
        data: {
          email: `${steamId}@steam.local`,
          passwordHash: '', // Steam users have no password
          profile: {
            create: {
              displayName: `Player_${steamId.slice(-6)}`,
              avatarUrl: null
            }
          },
          apiTokens: {
            create: { steamId } // Store steamId so we can fetch their data
          }
        },
        include: { apiTokens: true, profile: true }
      });
    } else {
      console.log(`[Auth] User exists for steamId: ${steamId}`);
    }

    if (!user) throw new Error('Failed to create/find user');

    // Step 3: Fetch fresh profile data using server's API Key (non-blocking)
    // This enriches the user profile but does NOT block login
    (async () => {
      try {
        const { SteamService } = await import('../services/steam-service');
        const summary = await SteamService.getPlayerSummaries(steamId);
        if (summary && summary.personaname) {
          console.log(`[Auth] Updating profile for ${steamId} with name: ${summary.personaname}`);
          await prisma.userProfile.update({
            where: { userId: user.id },
            data: {
              displayName: summary.personaname,
              avatarUrl: summary.avatarfull || summary.avatarmedium || null
            }
          });
        }
      } catch (err) {
        console.warn('[Auth] Profile update failed (non-blocking):', (err as Error).message);
      }
    })();

    // Step 4: Create JWT token
    // This token proves the user is authenticated and contains their userId + steamId
    const token = signToken({ userId: user.id, email: user.email, steamId });

    // Step 5: Start background sync using the steamId stored in the token
    // This syncs the user's Steam games into our database (non-blocking)
    (async () => {
      try {
        const { DumpService } = await import('../services/dump-service');
        const { SyncService } = await import('../services/sync-service');
        console.log(`[Auth] Starting background sync for userId: ${user.id}, steamId: ${steamId}`);
        const dumpPath = await DumpService.generateDump(steamId, user.id);
        if (dumpPath) {
          console.log(`[Auth] ✓ Dump generated: ${dumpPath}`);
        }
        await SyncService.importDump(user.id);
        console.log(`[Auth] ✓ Sync complete for userId: ${user.id}`);
      } catch (bgErr) {
        console.warn('[Auth] Post-login sync failed (non-blocking):', (bgErr as Error).message);
      }
    })();

    // Step 6: Redirect to frontend with token
    console.log(`[Auth] ✓ Login complete for userId: ${user.id}, steamId: ${steamId}`);
    res.redirect(`http://localhost:3000/auth/callback?token=${token}`);
  } catch (error) {
    console.error('[Auth] Unexpected error:', error);
    res.redirect('http://localhost:3000/login?error=server_error');
  }
});

/**
 * Get current logged-in user info
 * Requires: Valid JWT token in Authorization header
 *
 * Returns: Profile + games from DB (uses steamId from token to fetch data)
 */
router.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, apiTokens: true }
    });

    if (!user || !user.apiTokens?.steamId) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Try to fetch fresh data from Steam, but use cached profile if it fails
    let playerSummary = null;
    let ownedGames = null;

    try {
      const { SteamService } = await import('../services/steam-service');
      [playerSummary, ownedGames] = await Promise.all([
        SteamService.getPlayerSummaries(user.apiTokens.steamId).catch(() => null),
        SteamService.getOwnedGames(user.apiTokens.steamId).catch(() => null)
      ]);
    } catch (steamErr) {
      console.warn('[Auth Me] Steam API failed, using cached profile data:', (steamErr as Error).message);
    }

    // Fallback to profile data if Steam API fails
    res.json({
      steamId: user.apiTokens.steamId,
      avatar: playerSummary?.avatarfull || playerSummary?.avatarmedium || user.profile?.avatarUrl,
      nickname: playerSummary?.personaname || user.profile?.displayName || 'Player',
      profileUrl: playerSummary?.profileurl,
      games: ownedGames?.games?.map((g: any) => ({
        appid: g.appid,
        name: g.name,
        playtime_forever: g.playtime_forever,
        playtime_hours: Math.round(g.playtime_forever / 60 * 10) / 10,
        img_icon_url: g.img_icon_url,
        img_logo_url: g.img_logo_url
      })) || []
    });
  } catch (error) {
    console.error('[Auth Me] Error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Temporarily public for demo (remove authMiddleware)
// Require auth for dashboard to ensure per-user isolation
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
