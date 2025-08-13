/**
 * local server entry file, for local development
 */
import app from './app.js';
import { createServer } from 'http';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

// Try to start server, if port is occupied then automatically try the next port
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

  // Setup graceful shutdown
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