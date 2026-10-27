import pg, { type QueryResultRow } from 'pg';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { runMigrations } from './migrate.js';

const { Pool } = pg;

export interface DbClient {
  query<T extends QueryResultRow = any>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec?(sql: string): Promise<unknown>;
}

let activePool: pg.Pool | null = null;
let customClient: DbClient | null = null;
let pgliteInstance: PGlite | null = null;
let isInitialized = false;

// Avoid paths containing spaces (e.g. 'ALL MY PROJECTS') which cause WASM initdb failure
const PGDATA_DIR = path.join(os.tmpdir(), 'smart_budget_pgdata');

async function initPglite(): Promise<DbClient> {
  if (!pgliteInstance) {
    // Auto-cleanup stale lock files from previous unclean shutdowns
    try {
      const pidFile = path.join(PGDATA_DIR, 'postmaster.pid');
      const lockFile = path.join(PGDATA_DIR, '.s.PGSQL.5432.lock.out');
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
      if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
    } catch {
      // Ignore if cannot delete
    }

    pgliteInstance = new PGlite(PGDATA_DIR);
    await runMigrations({
      query: (sql, params) => pgliteInstance!.query(sql, params),
      exec: (sql) => pgliteInstance!.exec(sql)
    });
    logger.info('✓ Embedded persistent PGlite ready with all migrations applied.');
  }

  customClient = {
    async query<T extends QueryResultRow = any>(sql: string, params?: unknown[]) {
      const res = await pgliteInstance!.query<T>(sql, params);
      return { rows: res.rows };
    },
    async exec(sql: string) {
      return await pgliteInstance!.exec(sql);
    }
  };

  isInitialized = true;
  return customClient;
}

export async function initDatabase(): Promise<DbClient> {
  if (customClient) {
    return customClient;
  }

  // 1. If explicit pglite or memory is requested
  if (env.DATABASE_URL.startsWith('pglite') || env.DATABASE_URL === 'memory') {
    return initPglite();
  }

  // 2. Try connecting to configured PostgreSQL
  try {
    const testPool = new Pool({
      connectionString: env.DATABASE_URL,
      connectionTimeoutMillis: 2000,
      max: 10,
      idleTimeoutMillis: 30000
    });

    const client = await testPool.connect();
    try {
      logger.info('Connected to PostgreSQL database');
      await runMigrations(client);
      activePool = testPool;
      isInitialized = true;
      return {
        query: (sql, params) => activePool!.query(sql, params)
      };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn(
      `PostgreSQL connection to ${env.DATABASE_URL.replace(/:[^:]+@/, ':****@')} was unavailable (${errorMessage}).`
    );
    logger.info(`✨ Starting embedded persistent PGlite database at ${PGDATA_DIR}...`);
    return initPglite();
  }
}

export function setDbClient(client: DbClient | null): void {
  customClient = client;
  isInitialized = !!client;
}

export async function getDbClient(): Promise<DbClient> {
  if (!isInitialized) {
    return await initDatabase();
  }
  if (customClient) {
    return customClient;
  }
  if (activePool) {
    return {
      query: (sql, params) => activePool!.query(sql, params)
    };
  }
  return await initDatabase();
}

export async function dbQuery<T extends QueryResultRow = any>(
  sql: string,
  params?: unknown[]
): Promise<{ rows: T[] }> {
  const client = await getDbClient();
  return client.query<T>(sql, params);
}

export async function withTransaction<T>(
  callback: (client: DbClient) => Promise<T>
): Promise<T> {
  const client = await getDbClient();
  if (customClient || pgliteInstance) {
    const active = customClient || {
      query: (s: string, p?: unknown[]) => pgliteInstance!.query(s, p),
      exec: (s: string) => pgliteInstance!.exec(s)
    };
    await active.query('BEGIN');
    try {
      const result = await callback(active);
      await active.query('COMMIT');
      return result;
    } catch (err) {
      await active.query('ROLLBACK');
      throw err;
    }
  }

  if (activePool) {
    const conn = await activePool.connect();
    try {
      await conn.query('BEGIN');
      const result = await callback(conn);
      await conn.query('COMMIT');
      return result;
    } catch (err) {
      await conn.query('ROLLBACK');
      throw err;
    } finally {
      conn.release();
    }
  }

  throw new Error('Database client not initialized');
}

export async function closeDatabase(): Promise<void> {
  if (activePool) {
    await activePool.end();
    activePool = null;
  }
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
  customClient = null;
  isInitialized = false;
}

