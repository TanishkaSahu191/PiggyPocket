import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { dbQuery } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { getLocalDateString } from '@smart-budget-tracker/shared';

const CreateTransactionSchema = z.object({
  amountPaise: z.number().int().positive(),
  category: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
  occurredAt: z.string().optional() // ISO string or YYYY-MM-DD
});

export const transactionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/transactions
   * Lists transactions for a given month or all recent transactions.
   */
  fastify.get('/', async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { monthKey?: string };

    const userRes = await dbQuery<{ timezone: string }>(
      'SELECT timezone FROM users WHERE id = $1',
      [userId]
    );
    const timezone = userRes.rows[0]?.timezone || 'Asia/Kolkata';

    let sql = `
      SELECT id, amount_paise, category, note, occurred_at, created_at
      FROM transactions
      WHERE user_id = $1 AND deleted_at IS NULL
    `;
    const params: unknown[] = [userId];

    if (query.monthKey) {
      sql += ` AND TO_CHAR(occurred_at AT TIME ZONE $2, 'YYYY-MM') = $3`;
      params.push(timezone, query.monthKey);
    }

    sql += ` ORDER BY occurred_at DESC, created_at DESC`;

    const res = await dbQuery<{
      id: string;
      amount_paise: string | number;
      category: string;
      note: string | null;
      occurred_at: Date;
      created_at: Date;
    }>(sql, params);

    return reply.send({
      transactions: res.rows.map((t) => ({
        id: t.id,
        amountPaise: Number(t.amount_paise),
        category: t.category,
        note: t.note,
        occurredAt: t.occurred_at.toISOString(),
        createdAt: t.created_at.toISOString()
      }))
    });
  });

  /**
   * POST /api/transactions
   * Creates a transaction. Supports late expenses for past months.
   * Automatically resolves category from user's keyword category rules if note contains a keyword.
   */
  fastify.post('/', async (request, reply) => {
    const userId = request.user!.id;
    const data = CreateTransactionSchema.parse(request.body);

    let assignedCategory = data.category?.trim();

    // If no category is given or is 'General', check user keyword category rules
    if (!assignedCategory || assignedCategory.toLowerCase() === 'general') {
      if (data.note) {
        const noteLower = data.note.toLowerCase();
        const rulesRes = await dbQuery<{ keyword: string; category: string }>(
          'SELECT keyword, category FROM category_rules WHERE user_id = $1 ORDER BY LENGTH(keyword) DESC',
          [userId]
        );

        for (const rule of rulesRes.rows) {
          if (noteLower.includes(rule.keyword.toLowerCase())) {
            assignedCategory = rule.category;
            break;
          }
        }
      }
    }

    if (!assignedCategory) {
      assignedCategory = 'General';
    }

    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();

    const res = await dbQuery<{
      id: string;
      amount_paise: string;
      category: string;
      note: string | null;
      occurred_at: Date;
    }>(
      `INSERT INTO transactions (user_id, amount_paise, category, note, occurred_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, amount_paise, category, note, occurred_at`,
      [userId, data.amountPaise, assignedCategory, data.note || null, occurredAt]
    );

    const tx = res.rows[0];
    return reply.status(201).send({
      transaction: {
        id: tx.id,
        amountPaise: Number(tx.amount_paise),
        category: tx.category,
        note: tx.note,
        occurredAt: tx.occurred_at.toISOString()
      }
    });
  });

  /**
   * DELETE /api/transactions/:id
   * Soft-deletes a transaction.
   */
  fastify.delete('/:id', async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    await dbQuery(
      'UPDATE transactions SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return reply.send({ success: true });
  });
};
