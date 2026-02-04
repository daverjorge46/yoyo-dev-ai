import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

const DATA_DIR = process.env.YOYO_AI_DATA_DIR || path.join(os.homedir(), '.yoyo-ai', 'workspace');
const DB_PATH = path.join(DATA_DIR, 'workspace.db');

let db: Database.Database;

export function initDatabase(): Database.Database {
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    -- Chat history
    CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      attachments TEXT,
      suggested_actions TEXT,
      timestamp INTEGER NOT NULL
    );

    -- Tasks
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'queued',
      progress INTEGER DEFAULT 0,
      config TEXT,
      result TEXT,
      error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      scheduled_at INTEGER,
      completed_at INTEGER
    );

    -- Automations
    CREATE TABLE IF NOT EXISTS automations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      template_id TEXT NOT NULL,
      config TEXT NOT NULL,
      schedule TEXT,
      enabled INTEGER DEFAULT 1,
      last_run INTEGER,
      next_run INTEGER,
      created_at INTEGER NOT NULL
    );

    -- Quick actions
    CREATE TABLE IF NOT EXISTS quick_actions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      confidence REAL NOT NULL,
      params TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      actioned_at INTEGER
    );

    -- Documents
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      connection_id TEXT,
      path TEXT,
      size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      summary TEXT,
      created_at INTEGER NOT NULL,
      modified_at INTEGER NOT NULL
    );

    -- Connections
    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      name TEXT NOT NULL,
      account TEXT,
      connected INTEGER DEFAULT 0,
      permissions TEXT,
      config TEXT,
      last_sync INTEGER,
      created_at INTEGER NOT NULL
    );

    -- Settings
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Cron jobs
    CREATE TABLE IF NOT EXISTS cron_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      schedule TEXT NOT NULL,
      command TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      last_run INTEGER,
      last_result TEXT,
      last_error TEXT,
      next_run INTEGER,
      run_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON tasks(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_history(timestamp);
    CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source);
    CREATE INDEX IF NOT EXISTS idx_quick_actions_status ON quick_actions(status);
    CREATE INDEX IF NOT EXISTS idx_cron_jobs_enabled ON cron_jobs(enabled);
    CREATE INDEX IF NOT EXISTS idx_cron_jobs_next_run ON cron_jobs(next_run);
  `);

  // Insert default settings if not exist
  const defaultSettings = {
    notifications: JSON.stringify({
      taskComplete: true,
      suggestions: true,
      messages: true,
      browserNotifications: false,
    }),
    appearance: JSON.stringify({
      theme: 'dark',
      compactMode: false,
    }),
    privacy: JSON.stringify({
      analytics: false,
      crashReports: false,
    }),
    data: JSON.stringify({
      autoBackup: true,
      retentionDays: 90,
    }),
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value);
  }

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

// Helper functions
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
