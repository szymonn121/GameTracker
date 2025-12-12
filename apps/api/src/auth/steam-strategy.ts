import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import { prisma } from '../db';
import { config } from '../config';

// Use a placeholder key - Steam OpenID doesn't actually validate this for authentication
const STEAM_API_KEY = process.env.STEAM_API_KEY || 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
const RETURN_URL = `${config.apiUrl}/auth/steam/return`;
const REALM = config.apiUrl;

passport.serializeUser((user, done) => {
  done(null, (user as { id: string }).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

passport.use(new SteamStrategy({
  returnURL: RETURN_URL,
  realm: REALM,
  apiKey: STEAM_API_KEY
}, async (identifier, profile, done) => {
  try {
    // Extract Steam ID from identifier URL
    const steamId = identifier.split('/').pop() || profile.id;
    const displayName = profile.displayName || `Steam User ${steamId.slice(-4)}`;
    const avatarUrl = profile.photos?.[2]?.value || profile.photos?.[0]?.value || '';

    // Find or create user based on Steam ID
    let user = await prisma.user.findFirst({
      where: { 
        OR: [
          { apiTokens: { steamId } },
          { email: `${steamId}@steam.local` }
        ]
      },
      include: { apiTokens: true }
    });

    if (!user) {
      // Create new user with Steam account
      user = await prisma.user.create({
        data: {
          email: `${steamId}@steam.local`,
          passwordHash: '', // No password for Steam users
          profile: {
            create: {
              displayName,
              avatarUrl
            }
          },
          apiTokens: {
            create: {
              steamId,
              steamKey: STEAM_API_KEY === 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' ? null : STEAM_API_KEY
            }
          }
        },
        include: { apiTokens: true }
      });
    } else if (!user.apiTokens?.steamId) {
      // Update existing user with Steam ID
      await prisma.apiToken.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          steamId,
          steamKey: STEAM_API_KEY === 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' ? null : STEAM_API_KEY
        },
        update: {
          steamId,
          steamKey: STEAM_API_KEY === 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' ? null : STEAM_API_KEY
        }
      });
    }

    done(null, user);
  } catch (err) {
    console.error('Steam auth error:', err);
    done(err);
  }
}));

export { passport };
