/**
 * Memory System Type Definitions
 *
 * Core types for the Yoyo AI memory system including memory blocks,
 * scopes, and content schemas.
 */
/**
 * Memory system error with structured information.
 */
export class MemoryError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'MemoryError';
    }
}
//# sourceMappingURL=types.js.map