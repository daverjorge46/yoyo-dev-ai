/**
 * /remember Command Implementation
 *
 * Processes user instructions to update memory blocks:
 * - Parses instruction text
 * - Auto-detects or uses explicit block targeting
 * - Updates the appropriate memory block
 * - Returns confirmation of what was stored
 */
import type { MemoryService } from '../service.js';
import type { MemoryBlockType } from '../types.js';
/**
 * Parsed instruction with optional explicit targeting.
 */
export interface ParsedInstruction {
    rawInstruction: string;
    explicitBlock?: MemoryBlockType;
}
/**
 * Result of updating memory from instruction.
 */
export interface UpdateResult {
    success: boolean;
    blockType: MemoryBlockType;
    message: string;
    changes?: string[];
}
/**
 * Result of the remember command.
 */
export interface RememberResult {
    success: boolean;
    blockType?: MemoryBlockType;
    message: string;
    confirmation?: string;
}
/**
 * Parse a user instruction to extract content and explicit targeting.
 *
 * @param instruction - Raw instruction text
 * @returns Parsed instruction with optional explicit block
 */
export declare function parseInstruction(instruction: string): ParsedInstruction;
/**
 * Auto-detect the target block type based on instruction content.
 *
 * @param parsed - Parsed instruction
 * @returns Detected block type
 */
export declare function detectTargetBlock(parsed: ParsedInstruction): MemoryBlockType;
/**
 * Update memory from a parsed instruction.
 *
 * @param service - MemoryService instance
 * @param instruction - Raw instruction text
 * @param blockType - Target block type
 * @returns Update result
 */
export declare function updateMemoryFromInstruction(service: MemoryService, instruction: string, blockType: MemoryBlockType): UpdateResult;
/**
 * Execute the /remember command.
 *
 * @param service - MemoryService instance
 * @param instruction - User instruction to remember
 * @returns Remember result
 */
export declare function rememberCommand(service: MemoryService, instruction: string): Promise<RememberResult>;
//# sourceMappingURL=remember.d.ts.map