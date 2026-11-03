/**
 * HTTP SERVER STARTUP
 */

import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { runMigrations } from './db/migrate.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Run SQL migrations on startup
    await runMigrations();

    app.listen(PORT, () => {
      console.log(`PiggyPocket Backend Server running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  }
}

startServer();

