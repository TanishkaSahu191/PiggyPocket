import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './utils/errors.js';

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

  // CORS limited to configured web origin
  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || origin === env.WEB_URL) {
        cb(null, true);
        return;
      }
      cb(new Error(`Not allowed by CORS for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  // /health endpoint
  app.get('/health', async (_req, reply) => {
    return reply.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV
    });
  });

  return app;
}

export type AppServer = ReturnType<typeof buildServer>;
