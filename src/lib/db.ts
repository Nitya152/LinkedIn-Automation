import { Pool } from "pg";
import path from "node:path";
import fs from "node:fs";

// Determine if we are using PostgreSQL (e.g. Render / Neon / Supabase) or local SQLite
const isPostgres = Boolean(process.env.DATABASE_URL);

let pgPool: Pool | null = null;
let sqliteDb: any = null;

if (isPostgres) {
  // Render PostgreSQL requires SSL in production
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" || process.env.DATABASE_URL?.includes("render.com")
      ? { rejectUnauthorized: false }
      : false,
    max: 10,
    idleTimeoutMillis: 30000,
  });
} else {
  // Local development SQLite fallback
  try {
    const Database = require("better-sqlite3");
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, "automation.db");
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma("journal_mode = WAL");
    sqliteDb.pragma("foreign_keys = ON");
  } catch (err) {
    console.warn("[DB] SQLite not available, running in-memory or awaiting DATABASE_URL:", err);
  }
}

let isInitialized = false;

export async function initDb(): Promise<void> {
  if (isInitialized) return;

  if (isPostgres && pgPool) {
    // PostgreSQL Schema for Render
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          status TEXT NOT NULL DEFAULT 'PENDING',
          account_id TEXT NOT NULL,
          base_url TEXT NOT NULL,
          api_key TEXT NOT NULL,
          min_delay_minutes REAL NOT NULL DEFAULT 2.0,
          max_delay_minutes REAL NOT NULL DEFAULT 5.0,
          reaction_type TEXT NOT NULL DEFAULT 'like',
          comment_text TEXT DEFAULT '',
          send_without_note INTEGER NOT NULL DEFAULT 0,
          total_profiles INTEGER NOT NULL DEFAULT 0,
          completed_profiles INTEGER NOT NULL DEFAULT 0,
          current_index INTEGER DEFAULT 0,
          next_run_at TEXT,
          current_gap_minutes REAL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS job_items (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
          position INTEGER NOT NULL,
          slug TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING',
          provider_id TEXT,
          name TEXT,
          headline TEXT,
          network_distance TEXT,
          connection_outcome TEXT,
          reaction_outcome TEXT,
          comment_outcome TEXT,
          delay_before_minutes REAL DEFAULT 0,
          delay_before_ms INTEGER DEFAULT 0,
          started_at TEXT,
          completed_at TEXT,
          duration_ms INTEGER DEFAULT 0,
          logs_json TEXT,
          raw_response_json TEXT,
          error TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_job_items_job ON job_items(job_id, position);
      `);
      isInitialized = true;
      console.log("[DB] Render PostgreSQL database initialized successfully.");
    } finally {
      client.release();
    }
  } else if (sqliteDb) {
    // SQLite Schema
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'PENDING',
        account_id TEXT NOT NULL,
        base_url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        min_delay_minutes REAL NOT NULL DEFAULT 2.0,
        max_delay_minutes REAL NOT NULL DEFAULT 5.0,
        reaction_type TEXT NOT NULL DEFAULT 'like',
        comment_text TEXT DEFAULT '',
        send_without_note INTEGER NOT NULL DEFAULT 0,
        total_profiles INTEGER NOT NULL DEFAULT 0,
        completed_profiles INTEGER NOT NULL DEFAULT 0,
        current_index INTEGER DEFAULT 0,
        next_run_at TEXT,
        current_gap_minutes REAL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS job_items (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        slug TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        provider_id TEXT,
        name TEXT,
        headline TEXT,
        network_distance TEXT,
        connection_outcome TEXT,
        reaction_outcome TEXT,
        comment_outcome TEXT,
        delay_before_minutes REAL DEFAULT 0,
        delay_before_ms INTEGER DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        duration_ms INTEGER DEFAULT 0,
        logs_json TEXT,
        raw_response_json TEXT,
        error TEXT,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_job_items_job ON job_items(job_id, position);
    `);
    isInitialized = true;
  }
}

// Convert '?' placeholders to '$1, $2, ...' for Postgres
function toPgSql(sql: string): string {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

export const db = {
  isPostgres,

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    await initDb();
    if (isPostgres && pgPool) {
      const res = await pgPool.query(toPgSql(sql), params);
      return res.rows as T[];
    } else if (sqliteDb) {
      return sqliteDb.prepare(sql).all(...params) as T[];
    }
    return [];
  },

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    await initDb();
    if (isPostgres && pgPool) {
      const res = await pgPool.query(toPgSql(sql), params);
      return (res.rows[0] as T) || null;
    } else if (sqliteDb) {
      return (sqliteDb.prepare(sql).get(...params) as T) || null;
    }
    return null;
  },

  async execute(sql: string, params: any[] = []): Promise<any> {
    await initDb();
    if (isPostgres && pgPool) {
      return await pgPool.query(toPgSql(sql), params);
    } else if (sqliteDb) {
      return sqliteDb.prepare(sql).run(...params);
    }
    return null;
  },
};

export default db;
