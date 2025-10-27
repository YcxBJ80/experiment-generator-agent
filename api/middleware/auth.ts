import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { verifyAuthToken } from '../services/authToken.js';

export interface RequestUser {
  id: string;
  username: string;
  email: string;
}

export interface AuthenticatedRequest extends ExpressRequest {
  user?: RequestUser;
}

export function requireAuth(req: AuthenticatedRequest, res: ExpressResponse, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  const result = verifyAuthToken(token);
  if (!result.success || !result.payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired session' });
    return;
  }

  req.user = {
    id: result.payload.userId,
    username: result.payload.username,
    email: result.payload.email
  };

  next();
}
