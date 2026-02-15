/**
 * Orchestration Router for Global Orchestration Mode
 * @version 6.2.0
 * @description Routes classified intents to appropriate agents
 */

import {
  IntentClassification,
  RoutingDecision,
  RouterConfig,
} from './types';

// Default router configuration
const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  frontendDelegation: {
    enabled: true,
    agent: 'dave-engineer',
  },
  researchDelegation: {
    enabled: true,
    agent: 'alma-librarian',
    background: true,
  },
  codebaseDelegation: {
    enabled: true,
    agent: 'alvaro-explore',
  },
  failureEscalation: {
    enabled: true,
    agent: 'arthas-oracle',
    afterFailures: 3,
  },
};

export class OrchestrationRouter {
  private config: RouterConfig;

  constructor(config: Partial<RouterConfig> = {}) {
    this.config = {
      frontendDelegation: {
        ...DEFAULT_ROUTER_CONFIG.frontendDelegation,
        ...config.frontendDelegation,
      },
      researchDelegation: {
        ...DEFAULT_ROUTER_CONFIG.researchDelegation,
        ...config.researchDelegation,
      },
      codebaseDelegation: {
        ...DEFAULT_ROUTER_CONFIG.codebaseDelegation,
        ...config.codebaseDelegation,
      },
      failureEscalation: {
        ...DEFAULT_ROUTER_CONFIG.failureEscalation,
        ...config.failureEscalation,
      },
    };
  }

  /**
   * Route a classified intent to the appropriate agent(s)
   * @param classification - The intent classification result
   * @param userInput - Original user input
   * @returns Routing decision with agent assignments and prompts
   */
  route(
    classification: IntentClassification,
    userInput: string
  ): RoutingDecision {
    // Don't route if classification says not to orchestrate
    if (!classification.shouldOrchestrate) {
      return this.createNoOpRouting();
    }

    // Route based on intent
    switch (classification.intent) {
      case 'research':
        return this.routeResearch(userInput);

      case 'codebase':
        return this.routeCodebase(userInput);

      case 'frontend':
        return this.routeFrontend(userInput);

      case 'debug':
        return this.routeDebug(userInput);

      case 'documentation':
        return this.routeDocumentation(userInput);

      case 'planning':
        return this.routePlanning(userInput);

      case 'implementation':
        return this.routeImplementation(userInput);

      default:
        return this.createNoOpRouting();
    }
  }

  /**
   * Route research intent to Alma-Librarian
   */
  private routeResearch(userInput: string): RoutingDecision {
    if (!this.config.researchDelegation.enabled) {
      return this.createNoOpRouting();
    }

    const isBackground = this.config.researchDelegation.background;
    const agent = this.config.researchDelegation.agent;

    return {
      shouldDelegate: true,
      delegationType: isBackground ? 'background' : 'blocking',
      primaryAgent: isBackground ? null : agent,
      backgroundAgent: isBackground ? agent : null,
      agentPrompt: isBackground ? null : this.buildResearchPrompt(userInput),
      backgroundPrompt: isBackground ? this.buildResearchPrompt(userInput) : null,
    };
  }

  /**
   * Route codebase intent to Alvaro-Explore
   */
  private routeCodebase(userInput: string): RoutingDecision {
    if (!this.config.codebaseDelegation.enabled) {
      return this.createNoOpRouting();
    }

    return {
      shouldDelegate: true,
      delegationType: 'blocking',
      primaryAgent: this.config.codebaseDelegation.agent,
      backgroundAgent: null,
      agentPrompt: this.buildCodebasePrompt(userInput),
      backgroundPrompt: null,
    };
  }

  /**
   * Route frontend intent to Dave-Engineer
   */
  private routeFrontend(userInput: string): RoutingDecision {
    if (!this.config.frontendDelegation.enabled) {
      return this.createNoOpRouting();
    }

    return {
      shouldDelegate: true,
      delegationType: 'blocking',
      primaryAgent: this.config.frontendDelegation.agent,
      backgroundAgent: null,
      agentPrompt: this.buildFrontendPrompt(userInput),
      backgroundPrompt: null,
    };
  }

  /**
   * Route debug intent to Alvaro-Explore with Oracle escalation
   */
  private routeDebug(userInput: string): RoutingDecision {
    return {
      shouldDelegate: true,
      delegationType: 'blocking',
      primaryAgent: 'alvaro-explore',
      backgroundAgent: null, // Oracle escalation happens after failures
      agentPrompt: this.buildDebugPrompt(userInput),
      backgroundPrompt: null,
    };
  }

  /**
   * Route documentation intent to Angeles-Writer
   */
  private routeDocumentation(userInput: string): RoutingDecision {
    return {
      shouldDelegate: true,
      delegationType: 'blocking',
      primaryAgent: 'angeles-writer',
      backgroundAgent: 'alvaro-explore', // Get codebase context
      agentPrompt: this.buildDocumentationPrompt(userInput),
      backgroundPrompt: 'Find relevant code for documentation context: ' + userInput,
    };
  }

  /**
   * Route planning intent to Yoyo-AI
   */
  private routePlanning(userInput: string): RoutingDecision {
    return {
      shouldDelegate: true,
      delegationType: 'blocking',
      primaryAgent: 'yoyo-ai',
      backgroundAgent: 'alma-librarian',
      agentPrompt: this.buildPlanningPrompt(userInput),
      backgroundPrompt: 'Research best practices for: ' + userInput,
    };
  }

  /**
   * Route implementation intent to Yoyo-AI
   */
  private routeImplementation(userInput: string): RoutingDecision {
    return {
      shouldDelegate: true,
      delegationType: 'blocking',
      primaryAgent: 'yoyo-ai',
      backgroundAgent: 'alvaro-explore',
      agentPrompt: this.buildImplementationPrompt(userInput),
      backgroundPrompt: 'Find relevant existing code for: ' + userInput,
    };
  }

  /**
   * Create a no-op routing decision
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

  // ============================================================
  // Prompt Builders
  // ============================================================

  private buildResearchPrompt(input: string): string {
    return `Research the following topic and provide comprehensive information with sources:

${input}

Include:
- Summary of key findings
- Code examples if relevant
- Links to documentation
- Best practices recommendations

Prefix all output with [alma-librarian]`;
  }

  private buildCodebasePrompt(input: string): string {
    return `Search the codebase for:

${input}

Provide:
- List of relevant files with paths
- Code snippets showing relevant sections
- Analysis of code structure
- Recommendations for where to make changes

Prefix all output with [alvaro-explore]`;
  }

  private buildFrontendPrompt(input: string): string {
    return `Implement the following frontend change:

${input}

Requirements:
- Use Tailwind CSS v4 for styling
- Ensure accessibility (WCAG 2.1 AA)
- Follow existing component patterns
- Include TypeScript types

Prefix all output with [dave-engineer]`;
  }

  private buildDebugPrompt(input: string): string {
    return `Debug and fix the following issue:

${input}

Steps:
1. Search for related code
2. Identify the root cause
3. Propose a fix
4. Write tests to prevent regression

Prefix all output with [alvaro-explore]`;
  }

  private buildDocumentationPrompt(input: string): string {
    return `Write documentation for:

${input}

Include:
- Clear explanation of functionality
- Code examples
- API reference if applicable
- Usage guidelines

Prefix all output with [angeles-writer]`;
  }

  private buildPlanningPrompt(input: string): string {
    return `Plan the implementation of:

${input}

Provide:
- Technical approach
- File structure
- Key decisions
- Potential challenges

Prefix all output with [yoyo-ai]`;
  }

  private buildImplementationPrompt(input: string): string {
    return `Implement:

${input}

Follow TDD approach:
1. Write failing tests
2. Implement code
3. Verify tests pass
4. Refactor if needed

Prefix all output with [yoyo-ai]`;
  }

  /**
   * Get current configuration
   */
  getConfig(): RouterConfig {
    return { ...this.config };
  }
}
