import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import routes from './routes';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use(express.json());

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'ChipMate Backend',
      version: '1.0.26',
      timestamp: new Date().toISOString()
    });
  });

  // Version check for PWA / native client updates
  const versionHandler = (_req: Request, res: Response) => {
    res.json({
      version: '1.0.26',
      buildTime: 1789371000000,
      releaseNotes: 'Foreign key cascade fixes for clean table/game deletion, scoped guest rankings (only played-with guests), default 5-10-25-100 denominations, and host game history deletion.'
    });
  };
  app.get('/version', versionHandler);
  app.get('/api/version', versionHandler);

  // API router
  app.use('/api', routes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
  });

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  });

  return app;
}
