/**
 * Memory Events System
 *
 * Event-driven architecture for GUI integration. The MemoryService emits
 * events that GUI components can subscribe to for real-time updates.
 */
import { EventEmitter } from 'node:events';
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
    emitEvent(event, payload) {
        return this.emit(event, payload);
    }
    /**
     * Subscribe to a typed memory event.
     */
    onEvent(event, listener) {
        return this.on(event, listener);
    }
    /**
     * Subscribe to a typed memory event (once).
     */
    onceEvent(event, listener) {
        return this.once(event, listener);
    }
    /**
     * Remove a typed memory event listener.
     */
    offEvent(event, listener) {
        return this.off(event, listener);
    }
}
// =============================================================================
// Event Helpers
// =============================================================================
/**
 * Create a memory:loaded event payload.
 */
export function createLoadedPayload(scope, blocks) {
    return { scope, blocks };
}
/**
 * Create a memory:updated event payload.
 */
export function createUpdatedPayload(block, previousVersion, isNew = false) {
    return { block, previousVersion, isNew };
}
/**
 * Create a memory:deleted event payload.
 */
export function createDeletedPayload(id, type, scope) {
    return { id, type, scope };
}
/**
 * Create a memory:error event payload.
 */
export function createErrorPayload(error, operation) {
    return { error, operation };
}
/**
 * Create a memory:init:progress event payload.
 */
export function createInitProgressPayload(step, progress, message) {
    const payload = { step, progress };
    if (message !== undefined) {
        payload.message = message;
    }
    return payload;
}
/**
 * Create a memory:init:complete event payload.
 */
export function createInitCompletePayload(blocks, duration) {
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
export function getMemoryEventBus() {
    return memoryEventBus;
}
//# sourceMappingURL=events.js.map