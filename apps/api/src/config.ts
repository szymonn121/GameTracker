import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/game_tracker',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  steamApiKey: process.env.STEAM_API_KEY || '',
  rateLimit: {
    windowMs: 60_000,
    max: 60
  }
};
