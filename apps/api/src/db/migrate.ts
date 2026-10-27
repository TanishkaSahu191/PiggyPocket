import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

export interface MigrationClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
  exec?(sql: string): Promise<unknown>;
}

/**
 * Executes multi-command SQL on client via exec or query.
 */
async function executeSqlScript(client: MigrationClient, sql: string): Promise<void> {
  if (typeof client.exec === 'function') {
    await client.exec(sql);
    return;
  }
  // Standard pg client query supports multiple statements in simple query mode
  await client.query(sql);
}

/**
 * Runs SQL migrations against any standard PostgreSQL client (pg.Client, pg.Pool, or PGlite).
 */
export async function runMigrations(client: MigrationClient): Promise<string[]> {
  // Ensure schema_migrations table exists
  await executeSqlScript(
    client,
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`
  );

  // Fetch already applied migrations
  const { rows } = await client.query('SELECT version FROM schema_migrations ORDER BY id ASC;');
  const appliedVersions = new Set(
    (rows as Array<{ version: string }>).map((r) => r.version)
  );

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.warn(`Migrations directory not found at: ${MIGRATIONS_DIR}`);
    return [];
  }

  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const newlyApplied: string[] = [];

  for (const file of migrationFiles) {
    if (appliedVersions.has(file)) {
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    logger.info(`Applying migration: ${file}`);
    await executeSqlScript(client, 'BEGIN;');
    try {
      await executeSqlScript(client, sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1);', [file]);
      await executeSqlScript(client, 'COMMIT;');
      newlyApplied.push(file);
      logger.info(`✓ Successfully applied: ${file}`);
    } catch (err) {
      await executeSqlScript(client, 'ROLLBACK;');
      logger.error({ err, file }, `Failed to apply migration: ${file}`);
      throw err;
    }
  }

  return newlyApplied;
}

// Standalone CLI runner
async function main() {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: env.DATABASE_URL
  });

  try {
    logger.info(`Connecting to database at ${env.DATABASE_URL.replace(/:[^:]+@/, ':****@')}`);
    const client = await pool.connect();
    try {
      const applied = await runMigrations(client);
      if (applied.length === 0) {
        logger.info('Database is already up to date. No new migrations.');
      } else {
        logger.info(`Applied ${applied.length} migration(s): ${applied.join(', ')}`);
      }
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, 'Migration command failed');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
