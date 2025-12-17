/**
 * Memory Events System
 *
 * Event-driven architecture for GUI integration. The MemoryService emits
 * events that GUI components can subscribe to for real-time updates.
 */
import { EventEmitter } from 'node:events';
import type { MemoryBlock, MemoryBlockType, MemoryScope, MemoryError } from './types.js';
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
    progress: number;
    message?: string;
}
/**
 * Payload for memory:init:complete event.
 * Emitted when /init finishes successfully.
 */
export interface MemoryInitCompletePayload {
    blocks: MemoryBlock[];
    duration: number;
}
/**
 * Payload for memory:scope:changed event.
 * Emitted when the active scope changes.
 */
export interface MemoryScopeChangedPayload {
    previousScope: MemoryScope;
    newScope: MemoryScope;
}
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
    'memory:cleared': {
        agentId: string;
    };
}
/**
 * All possible memory event names.
 */
export type MemoryEventName = keyof MemoryEventMap;
/**
 * Type-safe event emitter for memory events.
 * Extends Node.js EventEmitter with proper typing for all memory events.
 */
export declare class MemoryEventEmitter extends EventEmitter {
    /**
     * Emit a typed memory event.
     */
    emitEvent<K extends MemoryEventName>(event: K, payload: MemoryEventMap[K]): boolean;
    /**
     * Subscribe to a typed memory event.
     */
    onEvent<K extends MemoryEventName>(event: K, listener: (payload: MemoryEventMap[K]) => void): this;
    /**
     * Subscribe to a typed memory event (once).
     */
    onceEvent<K extends MemoryEventName>(event: K, listener: (payload: MemoryEventMap[K]) => void): this;
    /**
     * Remove a typed memory event listener.
     */
    offEvent<K extends MemoryEventName>(event: K, listener: (payload: MemoryEventMap[K]) => void): this;
}
/**
 * Create a memory:loaded event payload.
 */
export declare function createLoadedPayload(scope: MemoryScope, blocks: MemoryBlock[]): MemoryLoadedPayload;
/**
 * Create a memory:updated event payload.
 */
export declare function createUpdatedPayload(block: MemoryBlock, previousVersion: number, isNew?: boolean): MemoryUpdatedPayload;
/**
 * Create a memory:deleted event payload.
 */
export declare function createDeletedPayload(id: string, type: MemoryBlockType, scope: MemoryScope): MemoryDeletedPayload;
/**
 * Create a memory:error event payload.
 */
export declare function createErrorPayload(error: MemoryError, operation: string): MemoryErrorPayload;
/**
 * Create a memory:init:progress event payload.
 */
export declare function createInitProgressPayload(step: string, progress: number, message?: string): MemoryInitProgressPayload;
/**
 * Create a memory:init:complete event payload.
 */
export declare function createInitCompletePayload(blocks: MemoryBlock[], duration: number): MemoryInitCompletePayload;
/**
 * Global memory event bus for application-wide event handling.
 * GUI components can subscribe to this bus for updates.
 */
export declare const memoryEventBus: MemoryEventEmitter;
/**
 * Convenience function to get the global event bus.
 */
export declare function getMemoryEventBus(): MemoryEventEmitter;
//# sourceMappingURL=events.d.ts.map