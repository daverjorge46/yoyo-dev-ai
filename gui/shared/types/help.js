/**
 * Help Page Type Definitions
 *
 * Types for the documentation/help page in the GUI.
 */
// =============================================================================
// Constants
// =============================================================================
/**
 * Category display names and icons
 */
export const CATEGORY_INFO = {
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
];
