import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './utils/errors.js';
import { authRoutes } from './routes/auth.js';
import { onboardingRoutes } from './routes/onboarding.js';
import { notificationRoutes } from './routes/notifications.js';
import { reportRoutes } from './routes/reports.js';
import { settingsRoutes } from './routes/settings.js';
import { budgetRoutes } from './routes/budget.js';
import { transactionRoutes } from './routes/transactions.js';

export function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers["x-auth-token"]',
          'headers.authorization',
          'password',
          'otp',
          'token',
          'jwt_secret',
          'email_api_key'
        ],
        censor: '[REDACTED]'
      }
    }
  });

  // Central error handler
  app.setErrorHandler(errorHandler);

  // Rate Limiting
  app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded, please retry in a moment.'
    })
  });

  // CORS limited to configured web origin (with dev localhost flexibility)
  app.register(cors, {
    origin: (origin, cb) => {
      if (
        !origin ||
        origin === env.WEB_URL ||
        (env.NODE_ENV === 'development' &&
          (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')))
      ) {
        cb(null, true);
        return;
      }
      cb(new Error(`Not allowed by CORS for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  // /health and /api/health endpoints
  const healthHandler = async (_req: any, reply: any) => {
    return reply.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV
    });
  };
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // Authentication & Onboarding Routes
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(onboardingRoutes, { prefix: '/api/onboarding' });
  app.register(onboardingRoutes, { prefix: '/api/budget' });
  app.register(budgetRoutes, { prefix: '/api/budget' });
  app.register(notificationRoutes, { prefix: '/api/notifications' });
  app.register(reportRoutes, { prefix: '/api/reports' });
  app.register(settingsRoutes, { prefix: '/api/settings' });
  app.register(transactionRoutes, { prefix: '/api/transactions' });

  return app;
}

export type AppServer = ReturnType<typeof buildServer>;
