/**
 * /clear Command Implementation
 *
 * Clears conversation history while preserving memory blocks:
 * - Default: Clear conversation, keep memory
 * - With --include-memory: Clear both conversation and memory
 */
import type { MemoryService } from '../service.js';
import type { ClearOptions, MemoryBlockType } from '../types.js';
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
/**
 * Clear conversation session for an agent.
 * Optionally clears memory blocks as well.
 *
 * @param service - MemoryService instance
 * @param agentId - Agent ID to clear session for
 * @param options - Clear options
 * @returns Clear session result
 */
export declare function clearSession(service: MemoryService, agentId: string, options?: ClearOptions): ClearSessionResult;
/**
 * Verify that memory blocks still exist.
 * Used to confirm memory was preserved after clearing.
 *
 * @param service - MemoryService instance
 * @returns Memory verification result
 */
export declare function verifyMemoryIntact(service: MemoryService): MemoryVerifyResult;
/**
 * Execute the /clear command.
 *
 * @param service - MemoryService instance
 * @param agentId - Agent ID to clear session for
 * @param options - Clear options
 * @returns Clear result
 */
export declare function clearCommand(service: MemoryService, agentId: string, options?: ClearOptions): Promise<ClearResult>;
//# sourceMappingURL=clear.d.ts.map