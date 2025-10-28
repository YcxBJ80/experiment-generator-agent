/**
 * This is a API server
 */

import express, { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import messagesRoutes from './routes/messages.js';

// for esm mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });


const app = express();

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
app.get('/', (req: ExpressRequest, res: ExpressResponse) => {
  res.json({ 
    message: 'AI Experiment Platform API service is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * API Routes
 */
app.use('/api/messages', messagesRoutes);

app.get('/api/health', (req: ExpressRequest, res: ExpressResponse) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: Error, req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  console.error('Error details:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req: ExpressRequest, res: ExpressResponse) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path
  });
});

export default app;
