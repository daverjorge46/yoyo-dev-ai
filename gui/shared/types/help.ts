/**
 * Help Page Type Definitions
 *
 * Types for the documentation/help page in the GUI.
 */

// =============================================================================
// Content Types
// =============================================================================

/**
 * A single help article/item
 */
export interface HelpArticle {
  /** Unique ID for deep linking */
  id: string;
  /** Article title */
  title: string;
  /** Content type determines how it's rendered */
  type: 'text' | 'command' | 'diagram' | 'code';
  /** Markdown content */
  content: string;
  /** Optional nested children */
  children?: HelpArticle[];
}

/**
 * A help section containing multiple articles
 */
export interface HelpSection {
  /** Unique section ID */
  id: string;
  /** Section title */
  title: string;
  /** Icon name (from lucide-react) */
  icon: string;
  /** Articles in this section */
  articles: HelpArticle[];
  /** Whether section is expanded by default */
  defaultOpen?: boolean;
}

// =============================================================================
// Command Documentation Types
// =============================================================================

/**
 * A command flag/option
 */
export interface CommandFlag {
  /** Flag name (e.g., "--verbose") */
  name: string;
  /** Short alias (e.g., "-v") */
  alias?: string;
  /** Value type */
  type: 'boolean' | 'string' | 'number';
  /** Description */
  description: string;
  /** Default value */
  defaultValue?: string | number | boolean;
  /** Whether required */
  required?: boolean;
}

/**
 * A command example
 */
export interface CommandExample {
  /** Example command */
  command: string;
  /** Description of what this example does */
  description: string;
  /** Optional expected output */
  output?: string;
}

/**
 * Full command documentation
 */
export interface CommandDoc {
  /** Command name (e.g., "/create-spec") */
  name: string;
  /** Brief description */
  description: string;
  /** Category for grouping */
  category: CommandCategory;
  /** Available flags */
  flags?: CommandFlag[];
  /** Usage examples */
  examples?: CommandExample[];
  /** Related commands */
  related?: string[];
}

/**
 * Command categories
 */
export type CommandCategory =
  | 'product'      // Product planning
  | 'feature'      // Feature creation
  | 'execution'    // Task execution
  | 'fix'          // Bug fixing
  | 'review'       // Code review
  | 'status'       // Status & listings
  | 'research'     // Research & oracle
  | 'design'       // Design system
  | 'memory'       // Memory management
  | 'ralph'        // Ralph autonomous
  | 'utility';     // Utility commands

// =============================================================================
// Search Types
// =============================================================================

/**
 * Search result item
 */
export interface HelpSearchResult {
  /** Section ID containing the result */
  sectionId: string;
  /** Section title */
  sectionTitle: string;
  /** Article ID */
  articleId: string;
  /** Article title */
  articleTitle: string;
  /** Excerpt with matched text */
  excerpt: string;
  /** Match score (0-1, higher is better) */
  score: number;
  /** Type of content matched */
  type: HelpArticle['type'];
}

/**
 * Search response from API
 */
export interface HelpSearchResponse {
  query: string;
  results: HelpSearchResult[];
  totalMatches: number;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Response for sections endpoint
 */
export interface HelpSectionsResponse {
  sections: HelpSection[];
  commandCount: number;
  lastUpdated: string;
}

// =============================================================================
// Navigation Types
// =============================================================================

/**
 * Table of contents item
 */
export interface TocItem {
  id: string;
  title: string;
  level: number;
  children?: TocItem[];
}

/**
 * Current scroll position for scroll spy
 */
export interface ScrollPosition {
  activeSection: string;
  activeSectionTitle: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Category display names and icons
 */
export const CATEGORY_INFO: Record<CommandCategory, { label: string; icon: string }> = {
  product: { label: 'Product Planning', icon: 'Target' },
  feature: { label: 'Feature Creation', icon: 'Plus' },
  execution: { label: 'Task Execution', icon: 'Play' },
  fix: { label: 'Bug Fixing', icon: 'Wrench' },
  review: { label: 'Code Review', icon: 'Eye' },
  status: { label: 'Status & Listings', icon: 'List' },
  research: { label: 'Research & Oracle', icon: 'Search' },
  design: { label: 'Design System', icon: 'Palette' },
  memory: { label: 'Memory', icon: 'Database' },
  ralph: { label: 'Ralph Autonomous', icon: 'Bot' },
  utility: { label: 'Utility', icon: 'Settings' },
};

/**
 * Help section IDs for deep linking
 */
export const HELP_SECTION_IDS = [
  'getting-started',
  'installation',
  'commands',
  'workflows',
  'agents',
  'ralph',
  'memory',
  'skills',
  'gui',
] as const;

export type HelpSectionId = typeof HELP_SECTION_IDS[number];
