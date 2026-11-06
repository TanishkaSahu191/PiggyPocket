/**
 * DATABASE CONNECTION & QUERY ADAPTER - PostgreSQL with Resilient Fallback
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../../data/piggypocket_db.json');

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

let pool = null;
let isPgConnected = false;

const DEFAULT_DEMO_USER = {
  id: 'usr_demo_101',
  full_name: 'Tanishka Sahu',
  email: 'tanishkasahu191@gmail.com',
  phone: '9876543210',
  password_hash: bcrypt.hashSync('Password123!', 10),
  is_email_verified: true,
  is_phone_verified: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function loadPersistedStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          users: parsed.users || [{ ...DEFAULT_DEMO_USER }],
          otp_verifications: parsed.otp_verifications || [],
          monthly_budgets: parsed.monthly_budgets || [],
          transactions: parsed.transactions || [],
          user_settings: parsed.user_settings || [],
          email_logs: parsed.email_logs || [],
        };
      }
    }
  } catch (err) {
    console.warn('Could not load persisted database file:', err.message);
  }
  return {
    users: [{ ...DEFAULT_DEMO_USER }],
    otp_verifications: [],
    monthly_budgets: [],
    transactions: [],
    user_settings: [],
    email_logs: [],
  };
}

function savePersistedStore() {
  if (process.env.NODE_ENV === 'test') return;
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save persisted database file:', err.message);
  }
}

// Persistent file-backed local relational store for development
const memoryDb = loadPersistedStore();

if (connectionString && connectionString.trim() !== '') {
  try {
    const isSslRequired = connectionString.includes('sslmode=require') || process.env.NODE_ENV === 'production';
    pool = new Pool({
      connectionString,
      ssl: isSslRequired ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
    });

    pool.on('error', (err) => {
      console.warn('PostgreSQL Pool background error:', err.message);
    });
  } catch (err) {
    console.warn('Failed to initialize PostgreSQL pool:', err.message);
  }
} else {
  console.log('No DATABASE_URL configured. Running server with in-memory database store.');
}

/**
 * Executes a SQL query against PostgreSQL or fallback store.
 * @param {string} text - SQL query
 * @param {Array<any>} [params] - Query parameters
 * @returns {Promise<{ rows: Array<any>, rowCount: number }>}
 */
export async function query(text, params = []) {
  if (pool) {
    try {
      const res = await pool.query(text, params);
      return res;
    } catch (pgError) {
      console.warn('PostgreSQL query error, falling back to in-memory store:', pgError.message);
    }
  }

  // Memory fallback query handler
  const result = executeMemoryQuery(text, params);
  const lower = text.trim().toLowerCase();
  if (lower.startsWith('insert') || lower.startsWith('update') || lower.startsWith('delete')) {
    savePersistedStore();
  }
  return result;
}

/**
 * Lightweight in-memory query handler for local development without active PostgreSQL.
 */
function executeMemoryQuery(text, params = []) {
  const cleanSql = text.trim();
  const lower = cleanSql.toLowerCase();

  // 1. SELECT users (pure users table queries)
  if (lower.startsWith('select') && lower.includes('from users') && !lower.includes('join user_settings')) {
    if (lower.includes('where email =') || lower.includes('where lower(email) =')) {
      const email = String(params[0] || '').toLowerCase();
      const match = memoryDb.users.filter((u) => u.email.toLowerCase() === email);
      return { rows: match, rowCount: match.length };
    }
    if (lower.includes('where id =')) {
      const id = String(params[0] || '');
      const match = memoryDb.users.filter((u) => u.id === id);
      return { rows: match, rowCount: match.length };
    }
    return { rows: [...memoryDb.users], rowCount: memoryDb.users.length };
  }

  // 2. INSERT INTO users
  if (lower.startsWith('insert into users')) {
    const newUser = {
      id: params[0],
      full_name: params[1],
      email: params[2].toLowerCase(),
      phone: params[3],
      password_hash: params[4],
      is_email_verified: params[5] ?? false,
      is_phone_verified: params[6] ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryDb.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // 3. UPDATE users
  if (lower.startsWith('update users')) {
    if (lower.includes('password_hash =')) {
      const newHash = params[0];
      const email = String(params[1] || '').toLowerCase();
      const idx = memoryDb.users.findIndex((u) => u.email.toLowerCase() === email);
      if (idx !== -1) {
        memoryDb.users[idx].password_hash = newHash;
        return { rows: [memoryDb.users[idx]], rowCount: 1 };
      }
    }
    if (lower.includes('is_email_verified = true')) {
      const id = params[0];
      const idx = memoryDb.users.findIndex((u) => u.id === id);
      if (idx !== -1) {
        memoryDb.users[idx].is_email_verified = true;
        return { rows: [memoryDb.users[idx]], rowCount: 1 };
      }
    }
  }

  // 4. OTP Verifications
  if (lower.startsWith('insert into otp_verifications')) {
    const rec = {
      id: params[0],
      user_id: params[1],
      identifier: params[2].toLowerCase(),
      channel: params[3],
      purpose: params[4],
      code_hash: params[5],
      expires_at: params[6],
      attempts_count: 0,
      created_at: new Date().toISOString(),
    };
    memoryDb.otp_verifications.push(rec);
    return { rows: [rec], rowCount: 1 };
  }

  if (lower.startsWith('select') && lower.includes('from otp_verifications')) {
    const ident = String(params[0] || '').toLowerCase();
    const purpose = params[1];
    const records = memoryDb.otp_verifications
      .filter((o) => o.identifier.toLowerCase() === ident && o.purpose === purpose && !o.verified_at)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return { rows: records, rowCount: records.length };
  }

  if (lower.startsWith('update otp_verifications')) {
    const id = params[0];
    const idx = memoryDb.otp_verifications.findIndex((o) => o.id === id);
    if (idx !== -1) {
      memoryDb.otp_verifications[idx].verified_at = new Date().toISOString();
      return { rows: [memoryDb.otp_verifications[idx]], rowCount: 1 };
    }
  }

  // 5. Monthly Budgets
  if (lower.startsWith('select') && lower.includes('from monthly_budgets')) {
    const userId = params[0];
    if (lower.includes('where user_id = $1 and month = $2')) {
      const month = params[1];
      const match = memoryDb.monthly_budgets.filter((b) => b.user_id === userId && b.month === month);
      return { rows: match, rowCount: match.length };
    }
    const userBudgets = memoryDb.monthly_budgets.filter((b) => b.user_id === userId);
    return { rows: userBudgets, rowCount: userBudgets.length };
  }

  if (lower.startsWith('insert into monthly_budgets')) {
    const id = params[0];
    const user_id = params[1];
    const month = params[2];
    const existingIdx = memoryDb.monthly_budgets.findIndex((b) => b.user_id === user_id && b.month === month);
    const rec = {
      id,
      user_id,
      month,
      pocket_money: Number(params[3]),
      date_received: Number(params[4]),
      savings_goal: Number(params[5]),
      daily_limit: Number(params[6]),
      is_custom_limit: Boolean(params[7]),
      starting_reserve: Number(params[8]),
      carry_forward_decision: params[9],
      previous_month_remaining_reserve: Number(params[10] || 0),
      is_configured: Boolean(params[11]),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (existingIdx !== -1) {
      memoryDb.monthly_budgets[existingIdx] = rec;
    } else {
      memoryDb.monthly_budgets.push(rec);
    }
    return { rows: [rec], rowCount: 1 };
  }

  // 6. Transactions
  if (lower.startsWith('select') && lower.includes('from transactions')) {
    const userId = params[0];
    let match = memoryDb.transactions.filter((t) => t.user_id === userId);
    if (lower.includes('and month = $2')) {
      const month = params[1];
      match = match.filter((t) => t.month === month);
    }
    return { rows: match, rowCount: match.length };
  }

  if (lower.startsWith('insert into transactions')) {
    const rec = {
      id: params[0],
      user_id: params[1],
      month_id: params[2],
      month: params[3],
      amount: Number(params[4]),
      category: params[5],
      transaction_date: params[6],
      note: params[7],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const existingIdx = memoryDb.transactions.findIndex((t) => t.id === rec.id);
    if (existingIdx !== -1) {
      memoryDb.transactions[existingIdx] = rec;
    } else {
      memoryDb.transactions.push(rec);
    }
    return { rows: [rec], rowCount: 1 };
  }

  if (lower.startsWith('delete from transactions')) {
    const id = params[0];
    const userId = params[1];
    const before = memoryDb.transactions.length;
    memoryDb.transactions = memoryDb.transactions.filter((t) => !(t.id === id && t.user_id === userId));
    return { rows: [], rowCount: before - memoryDb.transactions.length };
  }

  // 7. User Settings
  if (lower.includes('from user_settings') || (lower.includes('from users u') && lower.includes('join user_settings'))) {
    if (lower.includes('where u.id =') || lower.includes('where user_id =')) {
      const userId = params[0];
      const user = memoryDb.users.find((u) => u.id === userId) || {};
      const s = memoryDb.user_settings.find((item) => item.user_id === userId) || {};
      return {
        rows: [{
          id: userId,
          email: user.email || 'user@example.com',
          full_name: user.full_name || 'Student',
          daily_email_enabled: s.daily_email_enabled ?? true,
          delivery_hour: s.delivery_hour ?? 22,
          time_zone: s.time_zone ?? 'Asia/Kolkata',
          notification_email: s.notification_email || user.email || 'user@example.com',
        }],
        rowCount: 1,
      };
    }
    // All users with settings for scheduler
    const all = memoryDb.users.map((u) => {
      const s = memoryDb.user_settings.find((item) => item.user_id === u.id) || {};
      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        daily_email_enabled: s.daily_email_enabled ?? true,
        delivery_hour: s.delivery_hour ?? 22,
        time_zone: s.time_zone ?? 'Asia/Kolkata',
        notification_email: s.notification_email || u.email,
      };
    });
    return { rows: all, rowCount: all.length };
  }

  if (lower.startsWith('insert into user_settings')) {
    const userId = params[0];
    const rec = {
      user_id: userId,
      daily_email_enabled: params[1] ?? true,
      delivery_hour: Number(params[2] ?? 22),
      time_zone: params[3] ?? 'Asia/Kolkata',
      notification_email: params[4] || null,
      updated_at: new Date().toISOString(),
    };
    const idx = memoryDb.user_settings.findIndex((s) => s.user_id === userId);
    if (idx !== -1) {
      memoryDb.user_settings[idx] = { ...memoryDb.user_settings[idx], ...rec };
    } else {
      memoryDb.user_settings.push(rec);
    }
    return { rows: [rec], rowCount: 1 };
  }

  // 8. Email Logs
  if (lower.startsWith('select') && lower.includes('from email_logs')) {
    const userId = params[0];
    let list = memoryDb.email_logs.filter((l) => l.user_id === userId);
    if (lower.includes('email_type = $2 and date_sent = $3')) {
      const emailType = params[1];
      const dateSent = params[2];
      list = list.filter((l) => l.email_type === emailType && l.date_sent === dateSent && l.status === 'sent');
    }
    return { rows: list, rowCount: list.length };
  }

  if (lower.startsWith('insert into email_logs')) {
    const rec = {
      id: params[0],
      user_id: params[1],
      email_type: params[2],
      recipient_email: params[3],
      date_sent: params[4],
      sent_at: new Date().toISOString(),
      status: params[5] || 'sent',
      retry_count: Number(params[6] || 0),
      error_message: params[7] || null,
    };
    const existIdx = memoryDb.email_logs.findIndex(
      (l) => l.user_id === rec.user_id && l.email_type === rec.email_type && l.date_sent === rec.date_sent
    );
    if (existIdx !== -1) {
      memoryDb.email_logs[existIdx] = { ...memoryDb.email_logs[existIdx], ...rec };
    } else {
      memoryDb.email_logs.push(rec);
    }
    return { rows: [rec], rowCount: 1 };
  }

  // Fallback generic empty
  return { rows: [], rowCount: 0 };
}

export function resetMemoryDb() {
  memoryDb.users = [{ ...DEFAULT_DEMO_USER }];
  memoryDb.otp_verifications = [];
  memoryDb.monthly_budgets = [];
  memoryDb.transactions = [];
  memoryDb.user_settings = [];
  memoryDb.email_logs = [];
}

