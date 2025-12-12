import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { router } from './routes';
import { apiLimiter } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';

export function createServer() {
  const app = express();
  
  // CORS configuration
  app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
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
