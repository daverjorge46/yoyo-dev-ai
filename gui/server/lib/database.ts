/**
 * SQLite Database Utility using sql.js
 *
 * sql.js is a pure JavaScript SQLite implementation that doesn't require
 * native compilation, making it compatible with all Node.js versions.
 */

import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase } from 'sql.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Cache for initialized sql.js
let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;

/**
 * Initialize sql.js (cached, only runs once)
 */
async function getSqlJs(): Promise<typeof SQL> {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

/**
 * Open a database from a file path
 * Returns null if the file doesn't exist
 */
export async function openDatabase(dbPath: string): Promise<SqlJsDatabase | null> {
  if (!existsSync(dbPath)) {
    return null;
  }

  const SQL = await getSqlJs();
  if (!SQL) return null;

  const fileBuffer = readFileSync(dbPath);
  return new SQL.Database(fileBuffer);
}

/**
 * Create a new database at the specified path
 */
export async function createDatabase(dbPath: string): Promise<SqlJsDatabase | null> {
  const SQL = await getSqlJs();
  if (!SQL) return null;

  // Ensure directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return new SQL.Database();
}

/**
 * Save a database to disk
 */
export function saveDatabase(db: SqlJsDatabase, dbPath: string): void {
  const data = db.export();
  const buffer = Buffer.from(data);

  // Ensure directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(dbPath, buffer);
}

/**
 * Execute a query and return all results
 */
export function queryAll<T>(db: SqlJsDatabase, sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);

  const results: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as T;
    results.push(row);
  }
  stmt.free();

  return results;
}

/**
 * Execute a query and return the first result
 */
export function queryOne<T>(db: SqlJsDatabase, sql: string, params: unknown[] = []): T | undefined {
  const results = queryAll<T>(db, sql, params);
  return results[0];
}

/**
 * Execute a statement (INSERT, UPDATE, DELETE)
 */
export function execute(db: SqlJsDatabase, sql: string, params: unknown[] = []): void {
  db.run(sql, params);
}

/**
 * Get the number of rows affected by the last statement
 */
export function getChanges(db: SqlJsDatabase): number {
  return db.getRowsModified();
}

export type { SqlJsDatabase as Database };
