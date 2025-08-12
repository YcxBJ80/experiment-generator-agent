import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';

const router = express.Router();

// 简单的健康检查路由
router.get('/health', (req: ExpressRequest, res: ExpressResponse) => {
  res.json({ status: 'ok', message: 'Auth service is running' });
});

router.post('/login', (req: ExpressRequest, res: ExpressResponse) => {
  res.json({ success: true, message: 'Login endpoint' });
});

router.post('/register', (req: ExpressRequest, res: ExpressResponse) => {
  res.json({ success: true, message: 'Register endpoint' });
});

router.post('/logout', (req: ExpressRequest, res: ExpressResponse) => {
  res.json({ success: true, message: 'Logout endpoint' });
});

export default router;