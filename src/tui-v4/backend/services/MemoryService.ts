/**
 * Memory Service
 *
 * Integrates with Yoyo AI memory system to get block counts.
 * TODO: Full implementation with memory DB queries
 */

import type { MemoryStatus } from '../state-manager.js';

export class MemoryService {
  async getStatus(): Promise<MemoryStatus> {
    // TODO: Query .yoyo-ai/memory/memory.db for block count
    return {
      blockCount: 0,
      lastUpdated: null,
    };
  }
}

export const memoryService = new MemoryService();
