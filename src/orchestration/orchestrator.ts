/**
 * Main Orchestrator for Global Orchestration Mode
 * @version 6.2.0
 * @description Main entry point combining all orchestration components
 */

import { IntentClassifier } from './intent-classifier';
import { OrchestrationRouter } from './router';
import { OutputFormatter } from './output-formatter';
import { ConfigLoader } from './config-loader';
import {
  IntentClassification,
  RoutingDecision,
  OrchestrationConfig,
  OrchestrationResult,
  AgentName,
} from './types';

export class Orchestrator {
  private config: OrchestrationConfig;
  private classifier: IntentClassifier;
  private router: OrchestrationRouter;
  private formatter: OutputFormatter;
  private configLoader: ConfigLoader;

  constructor(projectRoot?: string) {
    this.configLoader = new ConfigLoader(projectRoot);
    this.config = this.configLoader.load();

    this.classifier = new IntentClassifier({
      confidenceThreshold: this.config.confidenceThreshold,
      maxLatencyMs: this.config.intentClassification.maxLatencyMs,
    });

    this.router = new OrchestrationRouter({
      frontendDelegation: this.config.routing.frontendDelegation,
      researchDelegation: this.config.routing.researchDelegation,
      codebaseDelegation: this.config.routing.codebaseDelegation,
      failureEscalation: this.config.routing.failureEscalation,
    });

    this.formatter = new OutputFormatter({
      showPrefixes: this.config.showPrefixes,
    });
  }

  /**
   * Process user input through the orchestration pipeline
   * @param userInput - Raw user input
   * @returns OrchestrationResult with classification, routing, and formatted output
   */
  process(userInput: string): OrchestrationResult {
    // Check if orchestration is enabled
    if (!this.config.enabled || !this.config.globalMode) {
      return {
        shouldOrchestrate: false,
        classification: this.createNoOpClassification(),
        routing: this.createNoOpRouting(),
        formattedOutput: null,
      };
    }

    // Classify intent
    const classification = this.classifier.classify(userInput);

    // Route based on classification
    const routing = this.router.route(classification, userInput);

    // Format initial output
    let formattedOutput: string | null = null;
    if (classification.shouldOrchestrate) {
      formattedOutput = this.formatter.formatIntentAnnouncement(
        classification.intent,
        classification.confidence,
        routing.primaryAgent
      );
    }

    return {
      shouldOrchestrate: classification.shouldOrchestrate,
      classification,
      routing,
      formattedOutput,
    };
  }

  /**
   * Format agent output with prefix
   * @param agent - Agent producing the output
   * @param message - Message to format
   */
  formatAgentOutput(agent: AgentName, message: string): string {
    return this.formatter.format(agent, message);
  }

  /**
   * Format a phase announcement
   * @param phase - Phase name/number
   * @param description - Phase description
   */
  formatPhase(phase: string, description: string): string {
    return this.formatter.formatPhaseAnnouncement(phase, description);
  }

  /**
   * Format progress update
   * @param completed - Completed count
   * @param total - Total count
   * @param current - Current task description
   */
  formatProgress(completed: number, total: number, current: string): string {
    return this.formatter.formatProgress(completed, total, current);
  }

  /**
   * Format transition between agents
   * @param from - Source agent
   * @param to - Target agent
   * @param reason - Reason for transition
   */
  formatTransition(from: AgentName | null, to: AgentName, reason: string): string {
    return this.formatter.formatTransition(from, to, reason);
  }

  /**
   * Format background task completion
   * @param agent - Agent that completed
   * @param summary - Summary of results
   */
  formatBackgroundComplete(agent: AgentName, summary: string): string {
    return this.formatter.formatBackgroundComplete(agent, summary);
  }

  /**
   * Format error message
   * @param agent - Agent encountering error
   * @param error - Error message
   * @param attempt - Current attempt
   * @param maxAttempts - Max attempts
   */
  formatError(
    agent: AgentName,
    error: string,
    attempt?: number,
    maxAttempts?: number
  ): string {
    return this.formatter.formatError(agent, error, attempt, maxAttempts);
  }

  /**
   * Format escalation message
   * @param from - Source agent
   * @param to - Target agent
   * @param reason - Reason for escalation
   */
  formatEscalation(from: AgentName, to: AgentName, reason: string): string {
    return this.formatter.formatEscalation(from, to, reason);
  }

  /**
   * Format success message
   * @param agent - Agent reporting success
   * @param message - Success message
   */
  formatSuccess(agent: AgentName, message: string): string {
    return this.formatter.formatSuccess(agent, message);
  }

  /**
   * Check if orchestration is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.config.globalMode;
  }

  /**
   * Get current configuration
   */
  getConfig(): OrchestrationConfig {
    return { ...this.config };
  }

  /**
   * Reload configuration from file
   */
  reloadConfig(): void {
    this.config = this.configLoader.reload();

    // Reinitialize components with new config
    this.classifier = new IntentClassifier({
      confidenceThreshold: this.config.confidenceThreshold,
      maxLatencyMs: this.config.intentClassification.maxLatencyMs,
    });

    this.router = new OrchestrationRouter({
      frontendDelegation: this.config.routing.frontendDelegation,
      researchDelegation: this.config.routing.researchDelegation,
      codebaseDelegation: this.config.routing.codebaseDelegation,
      failureEscalation: this.config.routing.failureEscalation,
    });

    this.formatter = new OutputFormatter({
      showPrefixes: this.config.showPrefixes,
    });
  }

  /**
   * Check if input should bypass orchestration
   * @param input - User input
   */
  shouldBypass(input: string): boolean {
    return this.classifier.shouldBypass(input);
  }

  /**
   * Get the classifier instance (for testing)
   */
  getClassifier(): IntentClassifier {
    return this.classifier;
  }

  /**
   * Get the router instance (for testing)
   */
  getRouter(): OrchestrationRouter {
    return this.router;
  }

  /**
   * Get the formatter instance (for testing)
   */
  getFormatter(): OutputFormatter {
    return this.formatter;
  }

  /**
   * Create a no-op classification result
   */
  private createNoOpClassification(): IntentClassification {
    return {
      intent: 'general',
      confidence: 0,
      primaryAgent: null,
      backgroundAgent: null,
      matchedKeywords: [],
      shouldOrchestrate: false,
    };
  }

  /**
   * Create a no-op routing result
   */
  private createNoOpRouting(): RoutingDecision {
    return {
      shouldDelegate: false,
      delegationType: 'none',
      primaryAgent: null,
      backgroundAgent: null,
      agentPrompt: null,
      backgroundPrompt: null,
    };
  }
}

// ============================================================
// Singleton Pattern
// ============================================================

let orchestratorInstance: Orchestrator | null = null;

/**
 * Get the singleton orchestrator instance
 * @param projectRoot - Optional project root path
 */
export function getOrchestrator(projectRoot?: string): Orchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new Orchestrator(projectRoot);
  }
  return orchestratorInstance;
}

/**
 * Reset the singleton orchestrator instance
 * Use for testing or when project root changes
 */
export function resetOrchestrator(): void {
  orchestratorInstance = null;
}

/**
 * Check if orchestrator is initialized
 */
export function isOrchestratorInitialized(): boolean {
  return orchestratorInstance !== null;
}
