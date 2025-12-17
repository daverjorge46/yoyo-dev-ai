/**
 * /clear Command Implementation
 *
 * Clears conversation history while preserving memory blocks:
 * - Default: Clear conversation, keep memory
 * - With --include-memory: Clear both conversation and memory
 */

import type { MemoryService } from '../service.js';
import type { ClearOptions, MemoryBlockType } from '../types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of clearing a session.
 */
export interface ClearSessionResult {
  messagesCleared: number;
  blocksCleared: number;
}

/**
 * Result of verifying memory is intact.
 */
export interface MemoryVerifyResult {
  intact: boolean;
  blockCount: number;
  blockTypes: MemoryBlockType[];
}

/**
 * Result of the clear command.
 */
export interface ClearResult {
  success: boolean;
  message: string;
  messagesCleared: number;
  blocksCleared: number;
  memoryPreserved: boolean;
  blockCount: number;
}

// =============================================================================
// Session Clearing
// =============================================================================

/**
 * Clear conversation session for an agent.
 * Optionally clears memory blocks as well.
 *
 * @param service - MemoryService instance
 * @param agentId - Agent ID to clear session for
 * @param options - Clear options
 * @returns Clear session result
 */
export function clearSession(
  service: MemoryService,
  agentId: string,
  options: ClearOptions = {}
): ClearSessionResult {
  // Get counts before clearing
  const messages = service.getConversationHistory(agentId);
  const messagesCleared = messages.length;
  let blocksCleared = 0;

  // Clear conversation history
  service.clearConversation(agentId);

  // Optionally clear memory blocks
  if (options.includeMemory) {
    const blocks = service.getAllBlocks();
    blocksCleared = blocks.length;

    for (const block of blocks) {
      service.deleteBlock(block.id);
    }
  }

  return {
    messagesCleared,
    blocksCleared,
  };
}

// =============================================================================
// Memory Verification
// =============================================================================

/**
 * Verify that memory blocks still exist.
 * Used to confirm memory was preserved after clearing.
 *
 * @param service - MemoryService instance
 * @returns Memory verification result
 */
export function verifyMemoryIntact(service: MemoryService): MemoryVerifyResult {
  const blocks = service.getAllBlocks();

  return {
    intact: blocks.length > 0,
    blockCount: blocks.length,
    blockTypes: blocks.map((b) => b.type),
  };
}

// =============================================================================
// Clear Command
// =============================================================================

/**
 * Execute the /clear command.
 *
 * @param service - MemoryService instance
 * @param agentId - Agent ID to clear session for
 * @param options - Clear options
 * @returns Clear result
 */
export async function clearCommand(
  service: MemoryService,
  agentId: string,
  options: ClearOptions = {}
): Promise<ClearResult> {
  // Clear session
  const clearResult = clearSession(service, agentId, options);

  // Verify memory status
  const memoryStatus = verifyMemoryIntact(service);

  // Build message
  let message: string;
  if (options.includeMemory) {
    message = `Session cleared: ${clearResult.messagesCleared} messages and ${clearResult.blocksCleared} memory blocks removed.`;
  } else {
    message = `Session cleared: ${clearResult.messagesCleared} messages removed. Memory preserved (${memoryStatus.blockCount} blocks intact).`;
  }

  return {
    success: true,
    message,
    messagesCleared: clearResult.messagesCleared,
    blocksCleared: clearResult.blocksCleared,
    memoryPreserved: !options.includeMemory,
    blockCount: memoryStatus.blockCount,
  };
}
