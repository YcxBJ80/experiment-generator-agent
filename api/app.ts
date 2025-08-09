/**
 * This is a API server
 */

import express, { type Request, type Response, type NextFunction }  from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import experimentsRoutes from './routes/experiments.js';
import conversationsRoutes from './routes/conversations.js';
import messagesRoutes from './routes/messages.js';

// for esm mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });


const app: express.Application = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * Root route
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Physics Experiment API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      experiments: '/api/experiments',
      conversations: '/api/conversations',
      messages: '/api/messages',
      health: '/api/health'
    },
    documentation: {
      experiments: {
        generate: 'POST /api/experiments/generate - Generate physics experiments',
        list: 'GET /api/experiments - List all experiments',
        get: 'GET /api/experiments/:id - Get specific experiment'
      }
    }
  });
});

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/experiments', experimentsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/messages', messagesRoutes);

/**
 * health
 */
app.use('/api/health', (req: Request, res: Response, next: NextFunction): void => {
  res.status(200).json({
    success: true,
    message: 'ok'
  });
});

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error'
  });
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found'
  });
});

export default app;