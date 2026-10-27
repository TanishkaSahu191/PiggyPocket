import type { QueryResultRow } from 'pg';
import { dbQuery, DbClient } from '../db/index.js';
import { getMailer, Mailer } from '../services/mailer/index.js';
import { logger } from '../utils/logger.js';
import { buildDailyEmailSummary } from '../services/summary/emailContent.js';
import { MonthBudgetInput } from '@smart-budget-tracker/shared';

export interface SchedulerTickResult {
  claimedCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
}

export interface UserScheduleCandidate {
  user_id: string;
  name: string;
  email: string;
  timezone: string;
  send_time_local: string;
  email_enabled: boolean;
}

/**
 * Computes user's local date, time, and minutes from midnight for a given UTC timestamp.
 */
export function getUserLocalDateTime(
  date: Date,
  timezone: string
): { localDate: string; localTime: string; totalMinutes: number } {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')!.value;
    const month = parts.find((p) => p.type === 'month')!.value;
    const day = parts.find((p) => p.type === 'day')!.value;
    const hour = parseInt(parts.find((p) => p.type === 'hour')!.value, 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')!.value, 10);

    const hourStr = String(hour).padStart(2, '0');
    const minuteStr = String(minute).padStart(2, '0');

    return {
      localDate: `${year}-${month}-${day}`,
      localTime: `${hourStr}:${minuteStr}`,
      totalMinutes: hour * 60 + minute
    };
  } catch (err) {
    logger.error({ err, timezone }, 'Invalid timezone, falling back to UTC');
    const iso = date.toISOString();
    const localDate = iso.substring(0, 10);
    const h = date.getUTCHours();
    const m = date.getUTCMinutes();
    return {
      localDate,
      localTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      totalMinutes: h * 60 + m
    };
  }
}

export function parseLocalTimeString(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

export function toDateString(val: string | Date): string {
  if (typeof val === 'string') {
    return val.substring(0, 10);
  }
  const y = val.getFullYear();
  const m = String(val.getMonth() + 1).padStart(2, '0');
  const d = String(val.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Performs a single scheduling tick.
 * Concurrency-safe: claims jobs with atomic INSERT ON CONFLICT DO NOTHING
 * and SELECT ... FOR UPDATE SKIP LOCKED.
 */
export async function tickScheduler(
  currentTimeInput?: Date,
  injectedDb?: DbClient,
  injectedMailer?: Mailer
): Promise<SchedulerTickResult> {
  const currentTime = currentTimeInput || new Date();
  const mailer = injectedMailer || getMailer();

  const queryFn = <T extends QueryResultRow = any>(sql: string, p?: unknown[]): Promise<{ rows: T[] }> =>
    injectedDb ? injectedDb.query<T>(sql, p) : dbQuery<T>(sql, p);

  const result: SchedulerTickResult = {
    claimedCount: 0,
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0
  };

  // 1. Fetch all users with email_enabled = true
  const usersRes = await queryFn<UserScheduleCandidate>(
    `SELECT u.id as user_id, u.name, u.email,
            COALESCE(np.timezone, u.timezone, 'Asia/Kolkata') as timezone,
            COALESCE(np.send_time_local, '22:00') as send_time_local,
            COALESCE(np.email_enabled, true) as email_enabled
     FROM users u
     LEFT JOIN notification_prefs np ON np.user_id = u.id
     WHERE COALESCE(np.email_enabled, true) = true;`
  );

  for (const user of usersRes.rows) {
    const { localDate, totalMinutes: currentMinutes } = getUserLocalDateTime(
      currentTime,
      user.timezone
    );
    const scheduledMinutes = parseLocalTimeString(user.send_time_local);
    const elapsedMinutes = currentMinutes - scheduledMinutes;

    // Not yet scheduled time for today
    if (elapsedMinutes < 0) {
      continue;
    }

    // Catch-up check: past 3 hours (180 minutes) -> mark skipped if not recorded
    if (elapsedMinutes > 180) {
      const skipClaim = await queryFn<{ id: string }>(
        `INSERT INTO email_delivery_log (user_id, report_date, status, last_error)
         VALUES ($1, $2, 'skipped', 'Catch-up window exceeded (> 3 hours past scheduled time)')
         ON CONFLICT (user_id, report_date) DO NOTHING
         RETURNING id;`,
        [user.user_id, localDate]
      );
      if (skipClaim.rows.length > 0) {
        result.skippedCount++;
      }
      continue;
    }

    // Inside valid sending window (0 to 180 minutes after scheduled time)
    // Atomically claim by inserting 'queued' row
    await queryFn(
      `INSERT INTO email_delivery_log (user_id, report_date, status, attempt_count, next_attempt_at)
       VALUES ($1, $2, 'queued', 0, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, report_date) DO NOTHING;`,
      [user.user_id, localDate]
    );
  }

  // 2. Process all pending/queued delivery logs that are due
  // Safe lock: SELECT ... FOR UPDATE SKIP LOCKED inside transaction
  const deliverableLogs = await queryFn<{
    id: string;
    user_id: string;
    report_date: string;
    attempt_count: number;
    status: string;
    name: string;
    email: string;
    timezone: string;
  }>(
    `SELECT l.id, l.user_id, l.report_date, l.attempt_count, l.status,
            u.name, u.email, COALESCE(np.timezone, u.timezone, 'Asia/Kolkata') as timezone
     FROM email_delivery_log l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN notification_prefs np ON np.user_id = u.id
     WHERE l.status = 'queued'
       AND (l.next_attempt_at IS NULL OR l.next_attempt_at <= $1)
       AND l.attempt_count < 5;`,
    [currentTime]
  );

  for (const log of deliverableLogs.rows) {
    // Atomically claim this log row so no concurrent worker can double-process
    const claimRes = await queryFn<{ id: string }>(
      `UPDATE email_delivery_log
       SET status = 'processing', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'queued'
       RETURNING id;`,
      [log.id]
    );

    if (claimRes.rows.length === 0) {
      // Already claimed by another concurrent worker instance
      continue;
    }

    result.claimedCount++;
    const reportDateStr = toDateString(log.report_date);
    const monthKey = reportDateStr.substring(0, 7);

    // Fetch budget period
    const periodRes = await queryFn<{
      pocket_money_paise: string;
      received_on: string | Date;
      savings_goal_paise: string;
      rule_version: number;
      id: string;
    }>(
      `SELECT pocket_money_paise, received_on, savings_goal_paise, rule_version, id
       FROM budget_periods
       WHERE user_id = $1 AND month_key = $2;`,
      [log.user_id, monthKey]
    );

    if (periodRes.rows.length === 0) {
      // User has no budget period for this month yet; skip delivery
      await queryFn(
        `UPDATE email_delivery_log
         SET status = 'skipped', last_error = 'No active budget period configured for this month', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1;`,
        [log.id]
      );
      result.skippedCount++;
      continue;
    }

    const period = periodRes.rows[0];

    // Fetch daily limit settings
    const limitsRes = await queryFn<{ effective_from: string | Date; limit_paise: string }>(
      `SELECT effective_from, limit_paise
       FROM daily_limit_settings
       WHERE budget_period_id = $1
       ORDER BY effective_from ASC;`,
      [period.id]
    );

    // Fetch transactions
    const txRes = await queryFn<{
      id: string;
      amount_paise: string;
      occurred_at: Date;
    }>(
      `SELECT id, amount_paise, occurred_at
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY occurred_at ASC;`,
      [log.user_id]
    );

    const budgetInput: MonthBudgetInput = {
      pocketMoneyPaise: Number(period.pocket_money_paise),
      originalSavingsGoalPaise: Number(period.savings_goal_paise),
      receivedOn: toDateString(period.received_on),
      timezone: log.timezone,
      rule_version: (period.rule_version as 1 | 2) || 2,
      effectiveDailyLimits: limitsRes.rows.map((r) => ({
        effectiveFrom: toDateString(r.effective_from),
        limitPaise: Number(r.limit_paise)
      })),
      transactions: txRes.rows.map((t) => ({
        id: t.id,
        amountPaise: Number(t.amount_paise),
        occurredAt: t.occurred_at
      }))
    };

    try {
      const emailContent = buildDailyEmailSummary({
        user: { name: log.name, email: log.email, timezone: log.timezone },
        budgetInput,
        targetDate: reportDateStr
      });

      // Dispatch via Mailer
      const mailRes = await mailer.sendEmail({
        to: log.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      });

      // Mark delivered successfully
      await queryFn(
        `UPDATE email_delivery_log
         SET status = 'sent',
             provider_message_id = $1,
             last_error = NULL,
             summary_payload = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3;`,
        [
          mailRes.messageId,
          JSON.stringify({
            spentPaise: emailContent.dailyMetrics.spentPaise,
            limitPaise: emailContent.dailyMetrics.limitPaise,
            reservoirBalancePaise: emailContent.dailyMetrics.reservoirBalancePaise,
            projectedSavingsPaise: emailContent.dailyMetrics.projectedSavingsPaise,
            shortfallPaise: emailContent.dailyMetrics.shortfallPaise,
            insight: emailContent.insight
          }),
          log.id
        ]
      );

      result.sentCount++;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const nextAttempt = log.attempt_count + 1;

      if (nextAttempt >= 5) {
        // Exceeded 5 attempts -> permanent failure
        await queryFn(
          `UPDATE email_delivery_log
           SET status = 'failed',
               attempt_count = $1,
               last_error = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3;`,
          [nextAttempt, `Permanent failure after 5 attempts: ${errorMsg}`, log.id]
        );
        result.failedCount++;
      } else {
        // Exponential backoff: 2^attempt minutes (2m, 4m, 8m, 16m)
        const backoffMinutes = Math.pow(2, nextAttempt);
        const nextAttemptAt = new Date(currentTime.getTime() + backoffMinutes * 60 * 1000);

        await queryFn(
          `UPDATE email_delivery_log
           SET status = 'queued',
               attempt_count = $1,
               last_error = $2,
               next_attempt_at = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4;`,
          [nextAttempt, errorMsg, nextAttemptAt, log.id]
        );
        result.failedCount++;
      }
    }
  }

  return result;
}

/**
 * Starts the standing background scheduler that ticks every minute.
 */
export function startScheduler(intervalMs: number = 60000): { stop: () => void } {
  let isRunning = false;
  let timer: NodeJS.Timeout | null = null;

  const runTick = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      const summary = await tickScheduler();
      if (summary.claimedCount > 0 || summary.sentCount > 0) {
        logger.info(summary, 'Scheduler tick executed');
      }
    } catch (err) {
      logger.error({ err }, 'Scheduler tick error');
    } finally {
      isRunning = false;
    }
  };

  // Initial immediate tick, then repeat every interval
  runTick();
  timer = setInterval(runTick, intervalMs);

  return {
    stop: () => {
      if (timer) clearInterval(timer);
    }
  };
}

// Standalone CLI runner: tsx src/scheduler/worker.ts
if (process.argv[1]?.includes('worker.ts') || process.argv[1]?.includes('worker.js')) {
  logger.info('🚀 PiggyPocket Scheduler Worker started. Ticking every 60s...');
  startScheduler();
}
