/**
 * Memory Service
 *
 * Integrates with Yoyo AI memory system to get block counts.
 * Queries the SQLite database at .yoyo-ai/memory/memory.db
 */

import { stat } from 'node:fs/promises';
import type { MemoryStatus } from '../state-manager.js';

export class MemoryService {
  private memoryDbPath = '.yoyo-ai/memory/memory.db';

  async getStatus(): Promise<MemoryStatus> {
    try {
      // Check if memory database exists
      const dbExists = await stat(this.memoryDbPath).catch(() => null);
      if (!dbExists) {
        return { blockCount: 0, lastUpdated: null };
      }

      // Use dynamic import for better-sqlite3 to avoid bundling issues
      const Database = (await import('better-sqlite3')).default;
      const db = new Database(this.memoryDbPath, { readonly: true });

      try {
        // Count memory blocks
        const countResult = db.prepare('SELECT COUNT(*) as count FROM memory_blocks').get() as { count: number };
        const blockCount = countResult?.count || 0;

        // Get most recent update time
        const updateResult = db.prepare(
          'SELECT MAX(updated_at) as lastUpdated FROM memory_blocks'
        ).get() as { lastUpdated: string | null };

        return {
          blockCount,
          lastUpdated: updateResult?.lastUpdated || null,
        };
      } finally {
        db.close();
      }
    } catch (error) {
      // Silently fail if database not accessible
      console.error('[MemoryService] Error getting status:', error);
      return { blockCount: 0, lastUpdated: null };
    }
  }

  /**
   * Check if memory system is initialized
   */
  async isInitialized(): Promise<boolean> {
    const dbExists = await stat(this.memoryDbPath).catch(() => null);
    return !!dbExists;
  }
}

export const memoryService = new MemoryService();
