import pg, { type QueryResultRow } from 'pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

export interface DbClient {
  query<T extends QueryResultRow = any>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

let activePool: pg.Pool | null = null;
let customClient: DbClient | null = null;

export function getPool(): pg.Pool {
  if (!activePool) {
    activePool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000
    });

    activePool.on('error', (err) => {
      logger.error({ err }, 'Unexpected database client error');
    });
  }
  return activePool;
}

/**
 * Used by tests to inject an in-memory client like PGlite.
 */
export function setDbClient(client: DbClient | null): void {
  customClient = client;
}

export async function dbQuery<T extends QueryResultRow = any>(
  sql: string,
  params?: unknown[]
): Promise<{ rows: T[] }> {
  if (customClient) {
    return customClient.query<T>(sql, params);
  }
  const pool = getPool();
  return pool.query<T>(sql, params);
}


export async function withTransaction<T>(
  callback: (client: DbClient) => Promise<T>
): Promise<T> {
  if (customClient) {
    // Custom test client / PGlite
    await customClient.query('BEGIN');
    try {
      const result = await callback(customClient);
      await customClient.query('COMMIT');
      return result;
    } catch (err) {
      await customClient.query('ROLLBACK');
      throw err;
    }
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
