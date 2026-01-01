/**
 * Output Formatter for Global Orchestration Mode
 * @version 6.1.0
 * @description Formats agent output with prefixes for visibility
 */

import { AgentName, FormatterConfig } from './types';

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
