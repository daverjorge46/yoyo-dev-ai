/**
 * Help Page Type Definitions
 *
 * Types for the documentation/help page in the GUI.
 */
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
export type CommandCategory = 'product' | 'feature' | 'execution' | 'fix' | 'review' | 'status' | 'research' | 'design' | 'memory' | 'ralph' | 'utility';
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
/**
 * Response for sections endpoint
 */
export interface HelpSectionsResponse {
    sections: HelpSection[];
    commandCount: number;
    lastUpdated: string;
}
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
/**
 * Category display names and icons
 */
export declare const CATEGORY_INFO: Record<CommandCategory, {
    label: string;
    icon: string;
}>;
/**
 * Help section IDs for deep linking
 */
export declare const HELP_SECTION_IDS: readonly ["getting-started", "installation", "commands", "workflows", "agents", "ralph", "memory", "skills", "gui"];
export type HelpSectionId = typeof HELP_SECTION_IDS[number];
