/**
 * Output Formatter for Global Orchestration Mode
 * @version 6.2.0
 * @description Formats agent output with prefixes for visibility
 */

import {
  AgentName,
  FormatterConfig,
  IntentClassification,
  RoutingDecision,
} from './types';

// ANSI color codes for terminal output
const ANSI_COLORS: Record<AgentName, string> = {
  'yoyo-ai': '\x1b[36m', // Cyan
  'arthas-oracle': '\x1b[33m', // Yellow
  'alma-librarian': '\x1b[32m', // Green
  'alvaro-explore': '\x1b[34m', // Blue
  'dave-engineer': '\x1b[35m', // Magenta
  'angeles-writer': '\x1b[37m', // White
};

const ANSI_RESET = '\x1b[0m';

// Agent-specific instructions for context injection
const AGENT_INSTRUCTIONS: Record<AgentName, string> = {
  'yoyo-ai':
    'You are the primary orchestrator. Coordinate work, delegate to specialized agents when appropriate, and ensure task completion.',
  'arthas-oracle':
    'You are a strategic advisor specializing in architecture decisions and debugging complex issues. Provide structured analysis with Essential, Expanded, and Edge Cases sections.',
  'alma-librarian':
    'You are a research specialist. Search external documentation, GitHub repos, and web resources. Return comprehensive findings with sources.',
  'alvaro-explore':
    'You are a codebase search specialist. Use Glob, Grep, and Read tools to find patterns, implementations, and code locations. Focus on internal codebase exploration.',
  'dave-engineer':
    'You are a frontend/UI specialist. Focus on components, styling, accessibility, and user experience. Use Tailwind CSS and React best practices.',
  'angeles-writer':
    'You are a documentation writer. Create clear, well-structured technical documentation, guides, and explanations.',
};

export class OutputFormatter {
  private config: FormatterConfig;

  constructor(config: Partial<FormatterConfig> = {}) {
    this.config = {
      showPrefixes: config.showPrefixes ?? true,
      colors: config.colors ?? ANSI_COLORS,
    };
  }

  /**
   * Format a message with agent prefix
   * @param agentName - The agent producing the output
   * @param message - The message to format
   * @returns Formatted message with prefix on each line
   */
  format(agentName: AgentName, message: string): string {
    if (!this.config.showPrefixes) {
      return message;
    }

    const prefix = this.buildPrefix(agentName);
    return this.prefixLines(prefix, message);
  }

  /**
   * Build a colored prefix for an agent
   */
  private buildPrefix(agentName: AgentName): string {
    const color = this.config.colors[agentName] ?? '';
    return `${color}[${agentName}]${ANSI_RESET}`;
  }

  /**
   * Add prefix to each line of the message
   */
  private prefixLines(prefix: string, message: string): string {
    return message
      .split('\n')
      .map((line) => `${prefix} ${line}`)
      .join('\n');
  }

  /**
   * Format a transition message between agents
   * @param from - Source agent (null for initial)
   * @param to - Target agent
   * @param reason - Reason for transition
   */
  formatTransition(
    from: AgentName | null,
    to: AgentName,
    reason: string
  ): string {
    const toPrefix = this.buildPrefix(to);

    if (from) {
      const fromName = this.config.showPrefixes ? from : '';
      return `${toPrefix} Delegating from ${fromName}: ${reason}`;
    }

    return `${toPrefix} ${reason}`;
  }

  /**
   * Format a background task completion message
   * @param agent - The agent that completed
   * @param summary - Summary of results
   */
  formatBackgroundComplete(agent: AgentName, summary: string): string {
    const prefix = this.buildPrefix(agent);
    return `${prefix} [Background Complete] ${summary}`;
  }

  /**
   * Format an intent classification announcement
   * @param intent - The classified intent
   * @param confidence - Confidence score
   * @param agent - The target agent
   */
  formatIntentAnnouncement(
    intent: string,
    confidence: number,
    agent: AgentName | null
  ): string {
    const prefix = this.buildPrefix('yoyo-ai');
    const confidencePercent = Math.round(confidence * 100);

    if (agent) {
      return `${prefix} Intent: ${intent} (${confidencePercent}% confidence). Delegating to ${agent}...`;
    }

    return `${prefix} Intent: ${intent} (${confidencePercent}% confidence). Processing directly...`;
  }

  /**
   * Format a phase announcement
   * @param phase - Phase number and name
   * @param description - Phase description
   */
  formatPhaseAnnouncement(phase: string, description: string): string {
    const prefix = this.buildPrefix('yoyo-ai');
    return `${prefix} ${phase}: ${description}`;
  }

  /**
   * Format a progress update
   * @param completed - Number of completed tasks
   * @param total - Total number of tasks
   * @param current - Current task description
   */
  formatProgress(completed: number, total: number, current: string): string {
    const prefix = this.buildPrefix('yoyo-ai');
    return `${prefix} Progress: [${completed}/${total}] ${current}`;
  }

  /**
   * Format an error message
   * @param agent - The agent that encountered the error
   * @param error - Error message
   * @param attempt - Current attempt number
   * @param maxAttempts - Maximum attempts
   */
  formatError(
    agent: AgentName,
    error: string,
    attempt?: number,
    maxAttempts?: number
  ): string {
    const prefix = this.buildPrefix(agent);

    if (attempt !== undefined && maxAttempts !== undefined) {
      return `${prefix} Error (attempt ${attempt}/${maxAttempts}): ${error}`;
    }

    return `${prefix} Error: ${error}`;
  }

  /**
   * Format an escalation message
   * @param from - Original agent
   * @param to - Escalation target
   * @param reason - Reason for escalation
   */
  formatEscalation(from: AgentName, to: AgentName, reason: string): string {
    const fromPrefix = this.buildPrefix(from);
    return `${fromPrefix} Escalating to ${to}: ${reason}`;
  }

  /**
   * Format a success message
   * @param agent - The agent reporting success
   * @param message - Success message
   */
  formatSuccess(agent: AgentName, message: string): string {
    const prefix = this.buildPrefix(agent);
    return `${prefix} ✓ ${message}`;
  }

  /**
   * Get a plain prefix without colors (for logging)
   * @param agentName - The agent name
   */
  getPlainPrefix(agentName: AgentName): string {
    return `[${agentName}]`;
  }

  /**
   * Check if a message already has an agent prefix
   * @param message - Message to check
   */
  hasPrefix(message: string): boolean {
    const prefixPattern = /^\[[\w-]+\]/;
    return prefixPattern.test(message.trim());
  }

  /**
   * Strip existing prefix from a message
   * @param message - Message with prefix
   */
  stripPrefix(message: string): string {
    return message.replace(/^\[[\w-]+\]\s*/, '');
  }

  /**
   * Format routing context for hook injection
   * This outputs text that Claude will see BEFORE the user's message
   *
   * NOTE: This provides CONTEXT ENRICHMENT ONLY - not agent switching.
   * Claude Code's Task tool with subagent_type is the proper way to delegate.
   *
   * @param classification - The intent classification result
   * @param routing - The routing decision
   * @param projectState - Optional project state (active spec, current task)
   * @returns Formatted context string for injection
   */
  formatRoutingContext(
    classification: IntentClassification,
    routing: RoutingDecision,
    projectState?: { activeSpec?: string; currentTask?: string; gitBranch?: string }
  ): string {
    const lines: string[] = [];
    const suggestedAgent = routing.primaryAgent ?? 'yoyo-ai';

    // Intent announcement (for visibility)
    if (this.config.showPrefixes) {
      const prefix = this.buildPrefix('yoyo-ai');
      lines.push(
        `${prefix} Intent: ${classification.intent} (confidence: ${classification.confidence.toFixed(2)})`
      );

      // Suggest delegation instead of claiming to switch
      if (suggestedAgent !== 'yoyo-ai') {
        lines.push(`${prefix} Suggested delegation: ${suggestedAgent}`);
      }
      lines.push('');
    }

    // Project context block (informational only)
    lines.push('PROJECT CONTEXT:');

    // Add project state if available
    if (projectState?.activeSpec) {
      lines.push(`Active Spec: ${projectState.activeSpec}`);
    }
    if (projectState?.currentTask) {
      lines.push(`Current Task: ${projectState.currentTask}`);
    }
    if (projectState?.gitBranch) {
      lines.push(`Git Branch: ${projectState.gitBranch}`);
    }

    // Add orchestration instructions (imperative, not suggestions)
    lines.push('');
    lines.push('ORCHESTRATION INSTRUCTIONS:');

    if (suggestedAgent !== 'yoyo-ai' && routing.primaryAgent) {
      // Delegation required - tell Claude to use Task tool
      const agentInstructions = AGENT_INSTRUCTIONS[suggestedAgent] ?? '';
      lines.push(`1. Use the Task tool with subagent_type="${suggestedAgent}" to handle this request.`);
      lines.push(`2. Agent role: ${agentInstructions}`);
      lines.push(`3. Prefix your summary with [${suggestedAgent}] when reporting results.`);
    } else {
      // No delegation - Claude handles directly
      lines.push('1. Handle this request directly (no delegation needed).');
      lines.push('2. Prefix your response with [yoyo-ai] to indicate you are the primary orchestrator.');
    }

    // Delimiter for clean separation from user message
    lines.push('---');

    return lines.join('\n');
  }

  /**
   * Get agent instructions for a specific agent
   * @param agent - The agent name
   */
  getAgentInstructions(agent: AgentName): string {
    return AGENT_INSTRUCTIONS[agent] ?? AGENT_INSTRUCTIONS['yoyo-ai'];
  }

  /**
   * Get current configuration
   */
  getConfig(): FormatterConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<FormatterConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
