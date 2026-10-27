import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer, AppServer } from '../server.js';
import { PGlite } from '@electric-sql/pglite';
import { runMigrations } from '../db/migrate.js';
import { z } from 'zod';
import { validateWithZod, BadRequestError } from '../utils/errors.js';

describe('API Foundation & Health Tests', () => {
  let app: AppServer;

  beforeAll(async () => {
    app = buildServer();

    // Register test error route before calling ready()
    app.get('/test-error', async () => {
      throw new BadRequestError('Invalid query parameter', [{ field: 'q', message: 'Required' }]);
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 with status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.environment).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  it('Central error handler handles custom AppErrors consistently', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test-error'
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body).toEqual({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid query parameter',
        details: [{ field: 'q', message: 'Required' }]
      }
    });
  });

  it('validateWithZod validates correct payloads and rejects bad payloads', () => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().min(18)
    });

    const valid = validateWithZod(schema, { email: 'student@example.com', age: 20 });
    expect(valid.email).toBe('student@example.com');

    expect(() => validateWithZod(schema, { email: 'bad-email', age: 10 })).toThrow(BadRequestError);
  });
});

describe('Database Migration Tests with PGlite', () => {
  it('Successfully applies SQL migrations to a database', async () => {
    const pglite = new PGlite();

    // Adapter for PGlite passing .exec for multi-statement scripts
    const client = {
      async query(sql: string, params?: unknown[]) {
        const res = await pglite.query(sql, params);
        return { rows: res.rows };
      },
      async exec(sql: string) {
        return await pglite.exec(sql);
      }
    };

    const applied = await runMigrations(client);
    expect(applied).toContain('001_initial_schema.sql');

    // Verify system_status table and schema_migrations table exist and were seeded
    const statusRes = await client.query('SELECT * FROM system_status;');
    expect(statusRes.rows.length).toBeGreaterThan(0);
    const firstRow = statusRes.rows[0] as { component: string; status: string };
    expect(firstRow.component).toBe('database_migration');
    expect(firstRow.status).toBe('initialized');

    // Running again applies zero new migrations (idempotent)
    const secondRun = await runMigrations(client);
    expect(secondRun.length).toBe(0);

    await pglite.close();
  });
});
