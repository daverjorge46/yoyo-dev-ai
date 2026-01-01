/**
 * Global Orchestration Mode Types
 * @version 6.1.0
 * @description Type definitions for the Yoyo Dev global orchestration system
 */

// Intent types that can be classified from user input
export type IntentType =
  | 'planning'
  | 'implementation'
  | 'research'
  | 'debug'
  | 'frontend'
  | 'documentation'
  | 'codebase'
  | 'general';

// Agent names in the orchestration system
export type AgentName =
  | 'yoyo-ai'
  | 'arthas-oracle'
  | 'alma-librarian'
  | 'alvaro-explore'
  | 'dave-engineer'
  | 'angeles-writer';

// Result of intent classification
export interface IntentClassification {
  intent: IntentType;
  confidence: number; // 0.0 - 1.0
  primaryAgent: AgentName | null;
  backgroundAgent: AgentName | null;
  matchedKeywords: string[];
  shouldOrchestrate: boolean;
}

// Configuration for the intent classifier
export interface ClassifierConfig {
  confidenceThreshold: number;
  maxLatencyMs: number;
  keywordLists: Record<IntentType, string[]>;
}

// Routing decision after classification
export interface RoutingDecision {
  shouldDelegate: boolean;
  delegationType: 'blocking' | 'background' | 'none';
  primaryAgent: AgentName | null;
  backgroundAgent: AgentName | null;
  agentPrompt: string | null;
  backgroundPrompt: string | null;
}

// Configuration for the router
export interface RouterConfig {
  frontendDelegation: {
    enabled: boolean;
    agent: AgentName;
  };
  researchDelegation: {
    enabled: boolean;
    agent: AgentName;
    background: boolean;
  };
  codebaseDelegation: {
    enabled: boolean;
    agent: AgentName;
  };
  failureEscalation: {
    enabled: boolean;
    agent: AgentName;
    afterFailures: number;
  };
}

// Full orchestration configuration
export interface OrchestrationConfig {
  enabled: boolean;
  globalMode: boolean;
  showPrefixes: boolean;
  confidenceThreshold: number;

  intentClassification: {
    enabled: boolean;
    maxLatencyMs: number;
  };

  routing: RouterConfig;

  backgroundTasks: {
    enabled: boolean;
    maxConcurrent: number;
    notificationOnComplete: boolean;
  };
}

// Output formatter configuration
export interface FormatterConfig {
  showPrefixes: boolean;
  colors: Record<AgentName, string>;
}

// Result of orchestration processing
export interface OrchestrationResult {
  shouldOrchestrate: boolean;
  classification: IntentClassification;
  routing: RoutingDecision;
  formattedOutput: string | null;
}

// Intent to agent mapping
export interface IntentAgentMapping {
  primary: AgentName | null;
  background: AgentName | null;
}
