import express from 'express';

const router = express.Router();

// 简单的健康检查路由
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Auth service is running' });
});

// 占位符路由，未来可以添加实际的认证功能
router.post('/login', (req, res) => {
  res.json({ success: false, message: 'Authentication not implemented yet' });
});

router.post('/register', (req, res) => {
  res.json({ success: false, message: 'Registration not implemented yet' });
});

router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;