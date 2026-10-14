import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "automation.db");
const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, PAUSED, COMPLETED, CANCELLED, FAILED
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
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, DELAYING, RUNNING, SUCCESS, ERROR, SKIPPED
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

export default db;
