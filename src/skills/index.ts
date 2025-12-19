/**
 * Skill System
 *
 * Main entry point for the skill learning system.
 */

// Types
export type {
  Skill,
  SkillContent,
  SkillApproach,
  SkillPitfall,
  SkillRegistry,
  SkillEntry,
  SkillUsage,
  SkillStats,
  SkillFilters,
  SkillSearchOptions,
  SkillPaths,
  SkillScope,
  ReflectionResult,
  ExtractedPattern,
  ExtractedPitfall,
  SkillCreationInput,
  SkillCreationResult,
  TaskContext,
  SkillMatch,
} from './types.js';

export {
  SKILL_DIRECTORY,
  REGISTRY_FILE,
  DEFAULT_REGISTRY,
  MAX_SKILLS_PER_TASK,
} from './types.js';

// Directory management
export {
  getSkillPaths,
  getProjectSkillPaths,
  getGlobalSkillPaths,
  skillDirectoryExists,
  registryExists,
  ensureSkillDirectory,
  listSkillFiles,
  getSkillFilePath,
  skillIdToFilename,
  filenameToSkillId,
  isValidSkillId,
  generateSkillId,
  skillExists,
  getDirectoryInfo,
} from './directory.js';

// Parser
export type { ParseResult } from './parser.js';
export {
  parseSkillFile,
  parseSkillContent,
  parseSkill,
  serializeSkill,
  saveSkill,
} from './parser.js';

// Discovery
export {
  loadSkillRegistry,
  saveSkillRegistry,
  discoverSkills,
  skillToEntry,
  refreshRegistry,
  addToRegistry,
  removeFromRegistry,
  getFromRegistry,
  updateSkillUsage,
  getAllSkillEntries,
  findSkillsByTag,
  findSkillsByTrigger,
  getTopSkillsByUsage,
  getRecentSkills,
} from './discovery.js';

// Service
export type { SkillServiceConfig } from './service.js';
export {
  SkillService,
  createProjectSkillService,
  createGlobalSkillService,
} from './service.js';

// Reflection Engine (Stage 1 Learning)
export type {
  Trajectory,
  TrajectoryMessage,
  ToolCall,
  ReflectionConfig,
} from './reflection.js';
export {
  checkTaskCompletion,
  assessReasoningQuality,
  detectPatterns,
  extractPitfalls,
  analyzeTrajectory,
  shouldCreateSkill,
} from './reflection.js';

// Creation Engine (Stage 2 Learning)
export {
  patternsToApproaches,
  pitfallsToSkillPitfalls,
  generateWhenToApply,
  generateVerificationSteps,
  generateSkillContent,
  generateUniqueId,
  createSkillFromReflection,
  validateCreationInput,
  mergeReflections,
  generateSkillPreview,
} from './creation.js';

// Selection Engine
export type { SelectionConfig } from './selection.js';
export {
  analyzeTaskContext,
  matchSkillTriggers,
  scoreSkillRelevance,
  selectTopSkills,
  hasRelevantSkills,
  getSkillSuggestions,
} from './selection.js';

// Application Engine
export type {
  FormatConfig,
  ApplicationResult,
  UsageRecord,
} from './application.js';
export {
  formatSkillForContext,
  formatSkillsForContext,
  applySkills,
  injectSkillsIntoContext,
  recordSkillsApplied,
  recordSkillOutcome,
  createUsageRecord,
  getSkillContext,
  applyAndTrackSkills,
} from './application.js';

// Store (Database Layer)
export type {
  SkillStore,
  SkillUsageRecord,
  SkillStatsRecord,
} from './store.js';
export {
  getSkillDbPath,
  initializeSkillStore,
  closeSkillStore,
  skillStoreExists,
  ensureSkillTracking,
  recordSkillUsage,
  updateSkillUsageOutcome,
  updateSkillSuccess,
  getSkillStats,
  getAllSkillStats,
  getTopSkillsByUsageFromStore,
  getTopSkillsBySuccessFromStore,
  getRecentlyUsedSkills,
  getSkillUsageHistory,
  getRecentUsageHistory,
  getAggregateStats,
} from './store.js';
