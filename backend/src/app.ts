import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes';

export function createApp() {
  const app = express();

  // Layer 2: HTTP Security Headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
  app.disable('x-powered-by');

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
      version: '1.1.35',
      timestamp: new Date().toISOString()
    });
  });

  // Version check for PWA / native client updates
  const versionHandler = (_req: Request, res: Response) => {
    res.json({
      version: '1.1.35',
      buildTime: Date.now(),
      releaseNotes: 'Add 3-layer security hardening: client-side anti-inspect protection, Helmet HTTP security headers, and Express API rate limiting.'
    });
  };
  app.get('/version', versionHandler);
  app.get('/api/version', versionHandler);
  app.get('/api/api/version', versionHandler);

  // Layer 3: API Rate Limiting
  const isTest = process.env.NODE_ENV === 'test';

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: isTest ? 10000 : 600, // 600 requests / 15 min per IP (~40 req/min for real-time table sync)
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many requests from this IP address, please try again later.'
    }
  });

  const authOtpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: isTest ? 1000 : 10, // 10 OTP requests per 10 minutes per IP
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many OTP requests from this IP. Please wait a few minutes before trying again.'
    }
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: isTest ? 1000 : 20, // 20 login attempts per 15 minutes per IP
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many login attempts. Please wait 15 minutes before trying again.'
    }
  });

  // Apply dedicated limiters to auth endpoints
  app.use('/api/auth/signup-request-otp', authOtpLimiter);
  app.use('/api/auth/request-otp', authOtpLimiter);
  app.use('/api/auth/signup-verify-otp', authOtpLimiter);
  app.use('/api/auth/verify-otp', authOtpLimiter);
  app.use('/api/auth/login', loginLimiter);

  // Apply general limiter to all API routes
  app.use('/api', generalLimiter);

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
