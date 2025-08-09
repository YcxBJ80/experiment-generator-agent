/**
 * local server entry file, for local development
 */
import app from './app';
import { createServer } from 'http';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

// 尝试启动服务器，如果端口被占用则自动尝试下一个端口
function startServer(port: number): void {
  const server = createServer(app);
  
  server.listen(port, () => {
    console.log(`Server ready on port ${port}`);
    console.log(`API available at: http://localhost:${port}/api`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  // 设置优雅关闭
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

startServer(Number(PORT));

export default app;