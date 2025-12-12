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
router.get('/auth/steam', (_req, res) => {
  const redirectUrl = steamAuth.getRedirectUrl();
  res.redirect(redirectUrl);
});

router.get('/auth/steam/return', async (req, res) => {
  try {
    const steamId = await steamAuth.verifyAssertion(req.query as Record<string, string>);
    
    if (!steamId) {
      return res.redirect('http://localhost:3000/login?error=auth_failed');
    }

    console.log(`[Steam Auth] User logged in: ${steamId}`);

    // Pobierz dane użytkownika ze Steam API (opcjonalne - nie blokuj logowania jeśli API zwraca błąd)
    const { SteamService } = await import('../services/steam-service');
    let playerSummary = null;
    
    try {
      playerSummary = await SteamService.getPlayerSummaries(steamId);
      if (!playerSummary) {
        console.warn('[Steam Auth] Could not fetch player summary - Steam API may be down or key invalid');
      }
    } catch (apiError) {
      console.error('[Steam Auth] Steam API error (non-blocking):', (apiError as Error).message);
      // Kontynuuj logowanie nawet jeśli Steam API nie działa
    }

    // Find or create user
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
      user = await prisma.user.create({
        data: {
          email: `${steamId}@steam.local`,
          passwordHash: '',
          profile: {
            create: {
              displayName: playerSummary?.personaname || `Player_${steamId.slice(-6)}`,
              avatarUrl: playerSummary?.avatarfull || playerSummary?.avatarmedium
            }
          },
          apiTokens: {
            create: { steamId }
          }
        },
        include: { apiTokens: true, profile: true }
      });
    } else if (playerSummary) {
      // Aktualizuj profil użytkownika danymi ze Steam (jeśli udało się pobrać)
      await prisma.userProfile.update({
        where: { userId: user.id },
        data: {
          displayName: playerSummary.personaname || user.profile?.displayName,
          avatarUrl: playerSummary.avatarfull || playerSummary.avatarmedium || user.profile?.avatarUrl
        }
      });
    }

    if (!user) throw new Error('Failed to resolve Steam user');

    const token = signToken({ userId: user.id, email: user.email, steamId });

    // Generate dump and kick off sync in background (non-blocking)
    (async () => {
      try {
        const { DumpService } = await import('../services/dump-service');
        const { SyncService } = await import('../services/sync-service');
        const dumpPath = await DumpService.generateDump(steamId, user.id);
        if (dumpPath) {
          console.log(`[Auth] Dump generated: ${dumpPath}`);
        }
        // Import from dump first (works even if Steam API returns 401), then try direct sync
        await SyncService.importDump(user.id);
        await SyncService.syncSteam(user.id);
      } catch (bgErr) {
        console.warn('[Auth] Post-login data sync failed (non-blocking):', (bgErr as Error).message);
      }
    })();
    res.redirect(`http://localhost:3000/auth/callback?token=${token}`);
  } catch (error) {
    console.error('Steam auth error:', error);
    res.redirect('http://localhost:3000/login?error=server_error');
  }
});

// Endpoint do pobierania danych zalogowanego użytkownika Steam
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
