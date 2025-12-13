import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { router } from './routes';
import { apiLimiter } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';
import { config } from './config';

export function createServer() {
  const app = express();
  
  // Validate Steam API Key is configured
  if (!config.steamApiKey) {
    console.warn('⚠️  WARNING: STEAM_API_KEY environment variable is not set!');
    console.warn('   Steam API calls will fail. Set STEAM_API_KEY in your .env file.');
  } else {
    console.log('✓ Steam API Key configured (length:', config.steamApiKey.length, 'chars)');
  }
  
  // CORS configuration: Allow requests from frontend
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean) as string[];
  
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  app.use(helmet());
  app.use(express.json());
  app.use(morgan('dev'));
  app.use(apiLimiter);

  app.use('/', router);

  app.use(errorHandler);
  return app;
}
