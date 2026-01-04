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
// All agents use Yoyo brand amber (#D29922 = RGB 210, 153, 34)
const AGENT_COLOR = '\x1b[38;2;210;153;34m'; // #D29922

const ANSI_COLORS: Record<AgentName, string> = {
  'yoyo-ai': AGENT_COLOR,
  'arthas-oracle': AGENT_COLOR,
  'alma-librarian': AGENT_COLOR,
  'alvaro-explore': AGENT_COLOR,
  'dave-engineer': AGENT_COLOR,
  'angeles-writer': AGENT_COLOR,
};

const ANSI_RESET = '\x1b[0m';
const ANSI_BOLD = '\x1b[1m';

// Yoyo brand colors (matching ui-library.sh)
const YOYO_YELLOW_DIM = '\x1b[38;2;168;122;27m'; // Dimmed yellow for borders
const BG_ELEVATED = '\x1b[48;2;33;38;45m'; // Elevated background (#21262d)
const SUBTEXT1 = '\x1b[38;2;186;194;222m'; // Subtext color
const OVERLAY0 = '\x1b[38;2;108;112;134m'; // Overlay for underlines
const TEXT_COLOR = '\x1b[38;2;205;214;244m'; // Main text color
const YOYO_YELLOW = '\x1b[38;2;210;153;34m'; // Yoyo brand yellow

// Box drawing characters (double-line)
const BOX_DBL_TL = '\u2554'; // Top-left corner
const BOX_DBL_TR = '\u2557'; // Top-right corner
const BOX_DBL_BL = '\u255A'; // Bottom-left corner
const BOX_DBL_BR = '\u255D'; // Bottom-right corner
const BOX_DBL_H = '\u2550'; // Horizontal line
const BOX_DBL_V = '\u2551'; // Vertical line

// Agent-specific icons (emojis)
const AGENT_ICONS: Record<AgentName, string> = {
  'yoyo-ai': '\uD83E\uDD16', // Robot
  'arthas-oracle': '\uD83D\uDD2E', // Crystal ball
  'alma-librarian': '\uD83D\uDCDA', // Books
  'alvaro-explore': '\uD83D\uDD0D', // Magnifying glass
  'dave-engineer': '\uD83C\uDFA8', // Art palette
  'angeles-writer': '\u270D\uFE0F', // Writing hand
};

// Agent descriptions (for panel display)
const AGENT_DESCRIPTIONS: Record<AgentName, string> = {
  'yoyo-ai': 'Primary orchestrator',
  'arthas-oracle': 'Strategic advisor and debugger',
  'alma-librarian': 'External research specialist',
  'alvaro-explore': 'Codebase search specialist',
  'dave-engineer': 'UI/UX development specialist',
  'angeles-writer': 'Technical documentation writer',
};

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
    return `${prefix} \u2713 ${message}`;
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
   * Format a visually distinct agent activity panel
   * Creates a boxed panel showing agent name (uppercase with underline),
   * agent description, and current task.
   *
   * Panel layout:
   * ╔═══════════════════════════════════════════════════════════════════════╗
   * ║  🔍 ALVARO-EXPLORE                                                    ║
   * ║  ─────────────────                                                    ║
   * ║  Codebase search specialist                                           ║
   * ║  Task: "theme configuration files"                                    ║
   * ╚═══════════════════════════════════════════════════════════════════════╝
   *
   * @param agentName - The agent to display
   * @param taskDescription - Optional task/query description
   * @param width - Panel width (default: 71)
   * @returns Formatted ANSI string for terminal display
   */
  formatAgentPanel(
    agentName: AgentName,
    taskDescription?: string,
    width: number = 71
  ): string {
    const agentColor = this.config.colors[agentName] ?? '';
    const agentIcon = AGENT_ICONS[agentName] ?? '\u25C9'; // Default circle
    const agentDesc = AGENT_DESCRIPTIONS[agentName] ?? 'Specialized agent';
    const agentUpper = agentName.toUpperCase();

    // Calculate content width (width minus borders and padding)
    const contentWidth = width - 4;

    // Create underline matching agent name length
    const underline = '\u2500'.repeat(agentUpper.length);

    const lines: string[] = [];

    // Helper to create a padded line with background
    const padLine = (content: string, visibleLen: number): string => {
      const padding = ' '.repeat(Math.max(0, contentWidth - visibleLen));
      return `${YOYO_YELLOW_DIM}${BOX_DBL_V}${ANSI_RESET}${BG_ELEVATED}${content}${padding}${ANSI_RESET}${YOYO_YELLOW_DIM}${BOX_DBL_V}${ANSI_RESET}`;
    };

    // Top border
    lines.push('');
    lines.push(
      `${YOYO_YELLOW_DIM}${BOX_DBL_TL}${BOX_DBL_H.repeat(width)}${BOX_DBL_TR}${ANSI_RESET}`
    );

    // Agent name line: "  🔍 ALVARO-EXPLORE"
    const nameContent = `  ${agentIcon} ${agentColor}${ANSI_BOLD}${agentUpper}${ANSI_RESET}${BG_ELEVATED}`;
    const nameVisibleLen = 2 + 2 + agentUpper.length; // "  " + icon + " " + name
    lines.push(padLine(nameContent, nameVisibleLen));

    // Underline line: "  ─────────────────"
    const underlineContent = `  ${OVERLAY0}${underline}${ANSI_RESET}${BG_ELEVATED}`;
    const underlineVisibleLen = 2 + underline.length;
    lines.push(padLine(underlineContent, underlineVisibleLen));

    // Agent description line
    const descContent = `  ${SUBTEXT1}${agentDesc}${ANSI_RESET}${BG_ELEVATED}`;
    const descVisibleLen = 2 + agentDesc.length;
    lines.push(padLine(descContent, descVisibleLen));

    // Task description if provided
    if (taskDescription) {
      // Truncate if too long
      const maxTaskLen = contentWidth - 12; // "  Task: " + quotes
      let taskDisplay = taskDescription;
      if (taskDescription.length > maxTaskLen) {
        taskDisplay = taskDescription.substring(0, maxTaskLen - 3) + '...';
      }

      const taskContent = `  ${TEXT_COLOR}Task: ${YOYO_YELLOW}"${taskDisplay}"${ANSI_RESET}${BG_ELEVATED}`;
      const taskVisibleLen = 8 + taskDisplay.length; // "  Task: " + quotes + content
      lines.push(padLine(taskContent, taskVisibleLen));
    }

    // Bottom border
    lines.push(
      `${YOYO_YELLOW_DIM}${BOX_DBL_BL}${BOX_DBL_H.repeat(width)}${BOX_DBL_BR}${ANSI_RESET}`
    );
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Get agent icon for a specific agent
   * @param agent - The agent name
   * @returns Emoji icon for the agent
   */
  getAgentIcon(agent: AgentName): string {
    return AGENT_ICONS[agent] ?? '\u25C9';
  }

  /**
   * Get agent description for a specific agent
   * @param agent - The agent name
   * @returns Short description of the agent's role
   */
  getAgentDescription(agent: AgentName): string {
    return AGENT_DESCRIPTIONS[agent] ?? 'Specialized agent';
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
