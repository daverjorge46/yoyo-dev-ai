/**
 * /remember Command Implementation
 *
 * Processes user instructions to update memory blocks:
 * - Parses instruction text
 * - Auto-detects or uses explicit block targeting
 * - Updates the appropriate memory block
 * - Returns confirmation of what was stored
 */

import type { MemoryService } from '../service.js';
import type {
  MemoryBlockType,
  PersonaContent,
  ProjectContent,
  UserContent,
  CorrectionsContent,
  CorrectionEntry,
} from '../types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Parsed instruction with optional explicit targeting.
 */
export interface ParsedInstruction {
  rawInstruction: string;
  explicitBlock?: MemoryBlockType;
}

/**
 * Result of updating memory from instruction.
 */
export interface UpdateResult {
  success: boolean;
  blockType: MemoryBlockType;
  message: string;
  changes?: string[];
}

/**
 * Result of the remember command.
 */
export interface RememberResult {
  success: boolean;
  blockType?: MemoryBlockType;
  message: string;
  confirmation?: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Keywords that indicate persona-related instructions.
 */
const PERSONA_KEYWORDS = [
  'concise', 'verbose', 'detailed', 'brief', 'thorough',
  'friendly', 'formal', 'casual', 'professional',
  'respond', 'responses', 'communicate', 'communication',
  'helpful', 'direct', 'explain', 'tone', 'style',
];

/**
 * Keywords that indicate project-related instructions.
 */
const PROJECT_KEYWORDS = [
  'project', 'codebase', 'repository', 'database', 'api',
  'framework', 'language', 'architecture', 'pattern',
  'uses', 'using', 'built', 'structure', 'stack',
  'postgresql', 'mongodb', 'convex', 'prisma', 'sqlite',
  'react', 'vue', 'angular', 'next', 'express',
];

/**
 * Keywords that indicate user preference instructions.
 */
const USER_KEYWORDS = [
  'i prefer', 'i like', 'i want', 'my preference',
  'show me', 'give me', 'include', 'don\'t include',
  'examples', 'explanations', 'minimal',
  'editor', 'tool', 'vim', 'vscode', 'neovim',
  'functional programming', 'object-oriented', 'coding style',
];

/**
 * Keywords that indicate correction instructions.
 */
const CORRECTION_KEYWORDS = [
  'when i say', 'i mean', 'actually', 'instead',
  'don\'t', 'never', 'always', 'remember to',
  'fix', 'correct', 'wrong', 'mistake',
];

// =============================================================================
// Instruction Parsing
// =============================================================================

/**
 * Parse a user instruction to extract content and explicit targeting.
 *
 * @param instruction - Raw instruction text
 * @returns Parsed instruction with optional explicit block
 */
export function parseInstruction(instruction: string): ParsedInstruction {
  const trimmed = instruction.trim();

  // Check for explicit block targeting using @ prefix
  const blockMatch = trimmed.match(/^@(persona|project|user|corrections)\s+(.+)$/i);

  if (blockMatch) {
    return {
      rawInstruction: blockMatch[2]?.trim() ?? '',
      explicitBlock: blockMatch[1]?.toLowerCase() as MemoryBlockType,
    };
  }

  return {
    rawInstruction: trimmed,
  };
}

/**
 * Auto-detect the target block type based on instruction content.
 *
 * @param parsed - Parsed instruction
 * @returns Detected block type
 */
export function detectTargetBlock(parsed: ParsedInstruction): MemoryBlockType {
  // Use explicit block if provided
  if (parsed.explicitBlock) {
    return parsed.explicitBlock;
  }

  const lower = parsed.rawInstruction.toLowerCase();

  // Check for correction patterns first (most specific)
  if (CORRECTION_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'corrections';
  }

  // Check for user keywords before persona (user preferences take precedence)
  if (USER_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'user';
  }

  // Check for project keywords
  if (PROJECT_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'project';
  }

  // Check for persona keywords
  if (PERSONA_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'persona';
  }

  // Default to user preferences
  return 'user';
}

// =============================================================================
// Memory Updates
// =============================================================================

/**
 * Update memory from a parsed instruction.
 *
 * @param service - MemoryService instance
 * @param instruction - Raw instruction text
 * @param blockType - Target block type
 * @returns Update result
 */
export function updateMemoryFromInstruction(
  service: MemoryService,
  instruction: string,
  blockType: MemoryBlockType
): UpdateResult {
  const changes: string[] = [];

  switch (blockType) {
    case 'persona':
      updatePersonaBlock(service, instruction, changes);
      break;
    case 'project':
      updateProjectBlock(service, instruction, changes);
      break;
    case 'user':
      updateUserBlock(service, instruction, changes);
      break;
    case 'corrections':
      updateCorrectionsBlock(service, instruction, changes);
      break;
  }

  return {
    success: true,
    blockType,
    message: `Updated ${blockType} memory`,
    changes,
  };
}

/**
 * Update persona memory block.
 */
function updatePersonaBlock(
  service: MemoryService,
  instruction: string,
  changes: string[]
): void {
  const existing = service.getPersona();
  const lower = instruction.toLowerCase();

  // Build updated content
  const content: PersonaContent = existing ?? {
    name: 'Yoyo',
    traits: [],
    communication_style: 'technical',
    expertise_areas: [],
  };

  // Check for communication style updates
  if (lower.includes('concise') || lower.includes('brief')) {
    content.communication_style = 'concise';
    changes.push('Set communication style to concise');
  } else if (lower.includes('detailed') || lower.includes('verbose')) {
    content.communication_style = 'detailed';
    changes.push('Set communication style to detailed');
  } else if (lower.includes('casual')) {
    content.communication_style = 'casual';
    changes.push('Set communication style to casual');
  } else if (lower.includes('formal')) {
    content.communication_style = 'formal';
    changes.push('Set communication style to formal');
  }

  // Check for trait updates
  const traitKeywords = ['concise', 'thorough', 'helpful', 'direct', 'friendly'];
  for (const trait of traitKeywords) {
    if (lower.includes(trait) && !content.traits.includes(trait)) {
      content.traits.push(trait);
      changes.push(`Added trait: ${trait}`);
    }
  }

  service.saveBlock('persona', content);
}

/**
 * Update project memory block.
 */
function updateProjectBlock(
  service: MemoryService,
  instruction: string,
  changes: string[]
): void {
  const existing = service.getProject();
  const lower = instruction.toLowerCase();

  // Build updated content
  const content: ProjectContent = existing ?? {
    name: 'Project',
    description: '',
    tech_stack: { language: 'Unknown', framework: 'Unknown' },
    architecture: 'unknown',
    patterns: [],
    key_directories: {},
  };

  // Check for database updates
  const databaseMap: Record<string, string> = {
    postgresql: 'PostgreSQL',
    mongodb: 'MongoDB',
    convex: 'Convex',
    prisma: 'Prisma',
    sqlite: 'SQLite',
    mysql: 'MySQL',
  };
  for (const [dbKey, dbName] of Object.entries(databaseMap)) {
    if (lower.includes(dbKey)) {
      content.tech_stack.database = dbName;
      changes.push(`Set database to ${dbName}`);
      break;
    }
  }

  // Check for framework updates
  const frameworks = ['react', 'vue', 'angular', 'next', 'nuxt', 'express', 'fastify'];
  for (const fw of frameworks) {
    if (lower.includes(fw)) {
      content.tech_stack.framework = fw.charAt(0).toUpperCase() + fw.slice(1);
      if (fw === 'next') content.tech_stack.framework = 'Next.js';
      if (fw === 'nuxt') content.tech_stack.framework = 'Nuxt';
      changes.push(`Set framework to ${content.tech_stack.framework}`);
      break;
    }
  }

  // Check for pattern updates
  if (lower.includes('tdd') || lower.includes('test-driven')) {
    if (!content.patterns.includes('TDD')) {
      content.patterns.push('TDD');
      changes.push('Added TDD pattern');
    }
  }

  // Update description if instruction seems descriptive
  if (instruction.length > 50 && !changes.length) {
    content.description = instruction;
    changes.push('Updated project description');
  }

  service.saveBlock('project', content);
}

/**
 * Update user memory block.
 */
function updateUserBlock(
  service: MemoryService,
  instruction: string,
  changes: string[]
): void {
  const existing = service.getUser();
  const lower = instruction.toLowerCase();

  // Build updated content
  const content: UserContent = existing ?? {
    coding_style: [],
    preferences: {},
    tools: [],
    communication: {
      verbosity: 'normal',
      examples: true,
      explanations: true,
    },
  };

  // Check for verbosity preference
  if (lower.includes('detailed') || lower.includes('verbose')) {
    content.communication.verbosity = 'detailed';
    changes.push('Set verbosity to detailed');
  } else if (lower.includes('minimal') || lower.includes('brief')) {
    content.communication.verbosity = 'minimal';
    changes.push('Set verbosity to minimal');
  }

  // Check for examples preference
  if (lower.includes('examples')) {
    content.communication.examples = !lower.includes('no examples') && !lower.includes("don't include examples");
    changes.push(`Examples: ${content.communication.examples ? 'enabled' : 'disabled'}`);
  }

  // Check for coding style preferences
  const styles = ['functional', 'object-oriented', 'immutable', 'declarative'];
  for (const style of styles) {
    if (lower.includes(style) && !content.coding_style.includes(style)) {
      content.coding_style.push(style);
      changes.push(`Added coding style: ${style}`);
    }
  }

  // Check for tool preferences
  const tools = ['vim', 'vscode', 'neovim', 'git', 'npm', 'pnpm', 'yarn'];
  for (const tool of tools) {
    if (lower.includes(tool) && !content.tools.includes(tool)) {
      content.tools.push(tool);
      changes.push(`Added tool: ${tool}`);
    }
  }

  // Store general preferences
  if (lower.includes('prefer') && changes.length === 0) {
    const prefKey = `preference_${Date.now()}`;
    content.preferences[prefKey] = instruction;
    changes.push('Stored general preference');
  }

  service.saveBlock('user', content);
}

/**
 * Update corrections memory block.
 */
function updateCorrectionsBlock(
  service: MemoryService,
  instruction: string,
  changes: string[]
): void {
  const existing = service.getCorrections();

  // Build updated content
  const content: CorrectionsContent = existing ?? {
    corrections: [],
  };

  // Parse the correction
  const correction: CorrectionEntry = {
    issue: extractIssue(instruction),
    correction: extractCorrection(instruction),
    date: new Date().toISOString(),
  };

  // Add context if available
  const contextMatch = instruction.match(/when\s+(.+?)\s+(i mean|actually|instead)/i);
  if (contextMatch?.[1]) {
    correction.context = contextMatch[1];
  }

  content.corrections.push(correction);
  changes.push(`Added correction: "${correction.issue}" -> "${correction.correction}"`);

  service.saveBlock('corrections', content);
}

/**
 * Extract the issue part from a correction instruction.
 */
function extractIssue(instruction: string): string {
  // Try to find "when I say X" pattern
  const whenMatch = instruction.match(/when i say ["\']?([^"']+)["\']?/i);
  if (whenMatch?.[1]) {
    return whenMatch[1].trim();
  }

  // Fall back to first part of instruction
  const parts = instruction.split(/,|\.|\bi mean\b|\bactually\b|\binstead\b/i);
  return parts[0]?.trim() ?? instruction;
}

/**
 * Extract the correction part from a correction instruction.
 */
function extractCorrection(instruction: string): string {
  // Try to find "I mean X" or "actually X" pattern
  const meanMatch = instruction.match(/i mean ["\']?(.+)["\']?$/i);
  if (meanMatch?.[1]) {
    return meanMatch[1].trim();
  }

  const actuallyMatch = instruction.match(/actually ["\']?(.+)["\']?$/i);
  if (actuallyMatch?.[1]) {
    return actuallyMatch[1].trim();
  }

  const insteadMatch = instruction.match(/instead ["\']?(.+)["\']?$/i);
  if (insteadMatch?.[1]) {
    return insteadMatch[1].trim();
  }

  // Fall back to second part of instruction
  const parts = instruction.split(/,|\.|\bi mean\b|\bactually\b|\binstead\b/i);
  return parts[1]?.trim() ?? instruction;
}

// =============================================================================
// Remember Command
// =============================================================================

/**
 * Execute the /remember command.
 *
 * @param service - MemoryService instance
 * @param instruction - User instruction to remember
 * @returns Remember result
 */
export async function rememberCommand(
  service: MemoryService,
  instruction: string
): Promise<RememberResult> {
  // Validate input
  if (!instruction || instruction.trim() === '') {
    return {
      success: false,
      message: 'Cannot remember empty instruction.',
    };
  }

  // Parse instruction
  const parsed = parseInstruction(instruction);

  // Detect target block
  const blockType = detectTargetBlock(parsed);

  // Update memory
  const result = updateMemoryFromInstruction(
    service,
    parsed.rawInstruction,
    blockType
  );

  // Build confirmation message
  const confirmation = result.changes?.length
    ? result.changes.join(', ')
    : `Stored in ${blockType} memory`;

  return {
    success: result.success,
    blockType: result.blockType,
    message: `I've remembered: "${parsed.rawInstruction}" (stored in ${blockType} memory)`,
    confirmation,
  };
}
