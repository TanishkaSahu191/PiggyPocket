import { buildServer } from './server.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { initDatabase } from './db/index.js';

async function start() {
  try {
    await initDatabase();
    const server = buildServer();

    const address = await server.listen({
      port: env.PORT,
      host: env.HOST
    });
    logger.info(`🚀 API Server running at ${address}`);
    logger.info(`Health check available at ${address}/health`);
  } catch (err) {
    logger.error({ err }, 'Failed to start API server');
    process.exit(1);
  }
}

start();

