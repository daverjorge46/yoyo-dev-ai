/**
 * Memory Events System
 *
 * Event-driven architecture for GUI integration. The MemoryService emits
 * events that GUI components can subscribe to for real-time updates.
 */

import { EventEmitter } from 'node:events';
import type {
  MemoryBlock,
  MemoryBlockType,
  MemoryScope,
  MemoryError,
} from './types.js';

// =============================================================================
// Event Payload Types
// =============================================================================

/**
 * Payload for memory:loaded event.
 * Emitted when memory blocks are loaded from the database.
 */
export interface MemoryLoadedPayload {
  scope: MemoryScope;
  blocks: MemoryBlock[];
}

/**
 * Payload for memory:updated event.
 * Emitted when a memory block is created or updated.
 */
export interface MemoryUpdatedPayload {
  block: MemoryBlock;
  previousVersion: number;
  isNew: boolean;
}

/**
 * Payload for memory:deleted event.
 * Emitted when a memory block is deleted.
 */
export interface MemoryDeletedPayload {
  id: string;
  type: MemoryBlockType;
  scope: MemoryScope;
}

/**
 * Payload for memory:error event.
 * Emitted when an error occurs during a memory operation.
 */
export interface MemoryErrorPayload {
  error: MemoryError;
  operation: string;
}

/**
 * Payload for memory:init:progress event.
 * Emitted during /init to report progress.
 */
export interface MemoryInitProgressPayload {
  step: string;
  progress: number; // 0-100
  message?: string;
}

/**
 * Payload for memory:init:complete event.
 * Emitted when /init finishes successfully.
 */
export interface MemoryInitCompletePayload {
  blocks: MemoryBlock[];
  duration: number; // milliseconds
}

/**
 * Payload for memory:scope:changed event.
 * Emitted when the active scope changes.
 */
export interface MemoryScopeChangedPayload {
  previousScope: MemoryScope;
  newScope: MemoryScope;
}

// =============================================================================
// Event Type Map
// =============================================================================

/**
 * Map of event names to their payload types.
 * Used for type-safe event handling.
 */
export interface MemoryEventMap {
  'memory:loaded': MemoryLoadedPayload;
  'memory:updated': MemoryUpdatedPayload;
  'memory:deleted': MemoryDeletedPayload;
  'memory:error': MemoryErrorPayload;
  'memory:init:progress': MemoryInitProgressPayload;
  'memory:init:complete': MemoryInitCompletePayload;
  'memory:scope:changed': MemoryScopeChangedPayload;
  'memory:cleared': { agentId: string };
}

/**
 * All possible memory event names.
 */
export type MemoryEventName = keyof MemoryEventMap;

// =============================================================================
// Typed Event Emitter
// =============================================================================

/**
 * Type-safe event emitter for memory events.
 * Extends Node.js EventEmitter with proper typing for all memory events.
 */
export class MemoryEventEmitter extends EventEmitter {
  /**
   * Emit a typed memory event.
   */
  emitEvent<K extends MemoryEventName>(
    event: K,
    payload: MemoryEventMap[K]
  ): boolean {
    return this.emit(event, payload);
  }

  /**
   * Subscribe to a typed memory event.
   */
  onEvent<K extends MemoryEventName>(
    event: K,
    listener: (payload: MemoryEventMap[K]) => void
  ): this {
    return this.on(event, listener);
  }

  /**
   * Subscribe to a typed memory event (once).
   */
  onceEvent<K extends MemoryEventName>(
    event: K,
    listener: (payload: MemoryEventMap[K]) => void
  ): this {
    return this.once(event, listener);
  }

  /**
   * Remove a typed memory event listener.
   */
  offEvent<K extends MemoryEventName>(
    event: K,
    listener: (payload: MemoryEventMap[K]) => void
  ): this {
    return this.off(event, listener);
  }
}

// =============================================================================
// Event Helpers
// =============================================================================

/**
 * Create a memory:loaded event payload.
 */
export function createLoadedPayload(
  scope: MemoryScope,
  blocks: MemoryBlock[]
): MemoryLoadedPayload {
  return { scope, blocks };
}

/**
 * Create a memory:updated event payload.
 */
export function createUpdatedPayload(
  block: MemoryBlock,
  previousVersion: number,
  isNew = false
): MemoryUpdatedPayload {
  return { block, previousVersion, isNew };
}

/**
 * Create a memory:deleted event payload.
 */
export function createDeletedPayload(
  id: string,
  type: MemoryBlockType,
  scope: MemoryScope
): MemoryDeletedPayload {
  return { id, type, scope };
}

/**
 * Create a memory:error event payload.
 */
export function createErrorPayload(
  error: MemoryError,
  operation: string
): MemoryErrorPayload {
  return { error, operation };
}

/**
 * Create a memory:init:progress event payload.
 */
export function createInitProgressPayload(
  step: string,
  progress: number,
  message?: string
): MemoryInitProgressPayload {
  return { step, progress, message };
}

/**
 * Create a memory:init:complete event payload.
 */
export function createInitCompletePayload(
  blocks: MemoryBlock[],
  duration: number
): MemoryInitCompletePayload {
  return { blocks, duration };
}

// =============================================================================
// Global Event Bus (Singleton)
// =============================================================================

/**
 * Global memory event bus for application-wide event handling.
 * GUI components can subscribe to this bus for updates.
 */
export const memoryEventBus = new MemoryEventEmitter();

/**
 * Convenience function to get the global event bus.
 */
export function getMemoryEventBus(): MemoryEventEmitter {
  return memoryEventBus;
}
