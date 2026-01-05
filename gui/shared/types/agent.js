/**
 * Agent Type Definitions
 *
 * Types for agent management in the GUI.
 * Agents are stored as markdown files in .claude/agents/
 */
// =============================================================================
// Constants
// =============================================================================
/**
 * Available model options for agent configuration
 */
export const AGENT_MODELS = [
    'claude-opus-4-5-20250514',
    'claude-sonnet-4-20250514',
    'gpt-4o',
    'gpt-4o-mini',
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
];
/**
 * Protected agents that cannot be deleted
 */
export const PROTECTED_AGENTS = ['yoyo-ai'];
/**
 * Default values for new agents
 */
export const DEFAULT_AGENT_VALUES = {
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    mode: 'Subagent',
    outputPrefix: '',
    fallbackModel: '',
};
