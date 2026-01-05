/**
 * Agent Type Definitions
 *
 * Types for agent management in the GUI.
 * Agents are stored as markdown files in .claude/agents/
 */
/**
 * Full agent definition with all metadata and content
 */
export interface Agent {
    /** Unique identifier (filename without .md) */
    id: string;
    /** Display name from frontmatter */
    name: string;
    /** Agent description from frontmatter */
    description: string;
    /** Model identifier (e.g., "claude-opus-4-5-20250514") */
    model: string;
    /** Temperature setting (0.0-2.0) */
    temperature: number;
    /** Agent mode: Primary or Subagent */
    mode: 'Primary' | 'Subagent';
    /** Version string */
    version: string;
    /** Tool access (e.g., "*" for all, "read-only", or specific list) */
    tools: string;
    /** Output prefix for console visibility (e.g., "[yoyo-ai]") */
    outputPrefix: string;
    /** Fallback model for rate limiting */
    fallbackModel?: string;
    /** Full markdown content */
    content: string;
    /** Absolute file path */
    filePath: string;
}
/**
 * Condensed agent info for list views
 */
export interface AgentSummary {
    id: string;
    name: string;
    description: string;
    model: string;
    temperature: number;
    mode: 'Primary' | 'Subagent';
    /** Real-time status (placeholder for future WebSocket integration) */
    status?: 'idle' | 'active' | 'error';
}
/**
 * Request body for creating a new agent
 */
export interface AgentCreateRequest {
    /** Agent name (will be kebab-cased for filename) */
    name: string;
    /** Description for frontmatter */
    description: string;
    /** Model to use */
    model: string;
    /** Temperature (0.0-2.0) */
    temperature: number;
    /** Agent mode */
    mode: 'Primary' | 'Subagent';
    /** Full markdown content (body section) */
    content: string;
    /** Output prefix */
    outputPrefix?: string;
    /** Fallback model */
    fallbackModel?: string;
}
/**
 * Request body for updating an agent
 */
export interface AgentUpdateRequest {
    /** Display name */
    name?: string;
    /** Description */
    description?: string;
    /** Model */
    model?: string;
    /** Temperature */
    temperature?: number;
    /** Mode */
    mode?: 'Primary' | 'Subagent';
    /** Full markdown content */
    content?: string;
    /** Output prefix */
    outputPrefix?: string;
    /** Fallback model */
    fallbackModel?: string;
}
/**
 * Response for agent list endpoint
 */
export interface AgentListResponse {
    agents: AgentSummary[];
    count: number;
    stats: AgentStats;
}
/**
 * Aggregate statistics about agents
 */
export interface AgentStats {
    total: number;
    byMode: {
        primary: number;
        subagent: number;
    };
    byModel: Record<string, number>;
    avgTemperature: number;
}
/**
 * Form state for agent editor
 */
export interface AgentFormState {
    name: string;
    description: string;
    model: string;
    temperature: number;
    mode: 'Primary' | 'Subagent';
    content: string;
    outputPrefix: string;
    fallbackModel: string;
}
/**
 * Validation errors for agent form
 */
export interface AgentFormErrors {
    name?: string;
    description?: string;
    model?: string;
    temperature?: string;
    content?: string;
}
/**
 * Available model options for agent configuration
 */
export declare const AGENT_MODELS: readonly ["claude-opus-4-5-20250514", "claude-sonnet-4-20250514", "gpt-4o", "gpt-4o-mini", "gemini-2.0-flash-exp", "gemini-1.5-pro"];
/**
 * Protected agents that cannot be deleted
 */
export declare const PROTECTED_AGENTS: readonly ["yoyo-ai"];
/**
 * Default values for new agents
 */
export declare const DEFAULT_AGENT_VALUES: Omit<AgentFormState, 'name' | 'description' | 'content'>;
