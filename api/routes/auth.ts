import express from 'express';
import { z } from 'zod';
import type { Response as ExpressResponse } from 'express';
import { generateCaptcha, verifyCaptcha } from '../services/captchaService.js';
import { createAuthToken } from '../services/authToken.js';
import { UserService, hashPassword, verifyPassword } from '../services/userService.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can contain letters, numbers, and underscores'),
  email: z.string().trim().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  confirmPassword: z
    .string()
    .min(8, 'Confirm password must be at least 8 characters')
    .max(128, 'Confirm password must be at most 128 characters'),
  captchaId: z.string().uuid('Captcha identifier invalid'),
  captchaAnswer: z.string().min(1, 'Captcha answer required')
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match'
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  captchaId: z.string().uuid('Captcha identifier invalid'),
  captchaAnswer: z.string().min(1, 'Captcha answer required')
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Auth service is running' });
});

router.get('/captcha', (_req, res) => {
  const captcha = generateCaptcha();
  res.json({
    success: true,
    data: captcha
  });
});

router.post('/register', async (req, res: ExpressResponse) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const issueMessages = parsed.error.issues.map(issue => issue.message);
      return res.status(400).json({
        success: false,
        error: issueMessages.join(', ')
      });
    }

    const { username, email, password, captchaId, captchaAnswer } = parsed.data;

    if (!verifyCaptcha(captchaId, captchaAnswer)) {
      return res.status(400).json({
        success: false,
        error: 'Captcha verification failed or expired'
      });
    }

    const existingEmail = await UserService.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'Email is already registered'
      });
    }

    const existingUsername = await UserService.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        error: 'Username is already taken'
      });
    }

    const passwordHash = hashPassword(password);
    let newUser;
    try {
      newUser = await UserService.createUser({
        username,
        email,
        password_hash: passwordHash
      });
    } catch (dbError) {
      const message = dbError instanceof Error ? dbError.message : 'Failed to create user account';
      const hint = message.includes('permission denied')
        ? 'Check SUPABASE_SERVICE_ROLE_KEY environment variable permissions.'
        : undefined;

      return res.status(500).json({
        success: false,
        error: hint ? `${message} ${hint}` : message
      });
    }

    const token = createAuthToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: newUser
      }
    });
  } catch (error) {
    console.error('Registration failed:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(500).json({
      success: false,
      error: message
    });
  }
});

router.post('/login', async (req, res: ExpressResponse) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const issueMessages = parsed.error.issues.map(issue => issue.message);
      return res.status(400).json({
        success: false,
        error: issueMessages.join(', ')
      });
    }

    const { email, password, captchaId, captchaAnswer } = parsed.data;

    if (!verifyCaptcha(captchaId, captchaAnswer)) {
      return res.status(400).json({
        success: false,
        error: 'Captcha verification failed or expired'
      });
    }

    const user = await UserService.findByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const token = createAuthToken({
      userId: user.id,
      username: user.username,
      email: user.email
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

router.post('/logout', (_req, res: ExpressResponse) => {
  res.json({
    success: true,
    data: { message: 'Logged out successfully' }
  });
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await UserService.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current user'
    });
  }
});

export default router;
