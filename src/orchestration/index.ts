/**
 * Global Orchestration Mode
 * @version 6.1.0
 * @module orchestration
 * @description Yoyo Dev global orchestration system for automatic agent delegation
 */

// Types
export type {
  IntentType,
  AgentName,
  IntentClassification,
  ClassifierConfig,
  RoutingDecision,
  RouterConfig,
  OrchestrationConfig,
  FormatterConfig,
  OrchestrationResult,
  IntentAgentMapping,
} from './types';

// Intent Classifier
export { IntentClassifier } from './intent-classifier';

// Orchestration Router
export { OrchestrationRouter } from './router';

// Output Formatter
export { OutputFormatter } from './output-formatter';

// Config Loader
export { ConfigLoader } from './config-loader';

// Main Orchestrator
export {
  Orchestrator,
  getOrchestrator,
  resetOrchestrator,
  isOrchestratorInitialized,
} from './orchestrator';
