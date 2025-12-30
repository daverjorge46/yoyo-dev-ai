/**
 * Skill Commands
 *
 * CLI commands for skill management:
 * - /skill list - List skills with optional filters
 * - /skill show <id> - Show skill details
 * - /skill apply <id> - Apply a specific skill
 * - /skill delete <id> - Delete a skill
 * - /skill stats - Show skill statistics
 * - /skill search <query> - Search for skills
 */

import type { CommandDefinition, CommandContext, CommandResult } from './types.js';
import {
  getProjectSkillPaths,
  getGlobalSkillPaths,
  ensureSkillDirectory,
  getAllSkillEntries,
  getFromRegistry,
  removeFromRegistry,
  parseSkill,
  formatSkillForContext,
  getSkillSuggestions,
  type SkillPaths,
  type SkillEntry,
} from '../skills/index.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get skill paths based on scope argument.
 */
function getPathsFromScope(args: string, cwd: string): { paths: SkillPaths; scope: string } {
  const isGlobal = args.includes('--global') || args.includes('-g');

  if (isGlobal) {
    return { paths: getGlobalSkillPaths(), scope: 'global' };
  }

  return { paths: getProjectSkillPaths(cwd), scope: 'project' };
}

/**
 * Parse subcommand and arguments from input.
 */
function parseSubcommand(args: string): { subcommand: string; rest: string } {
  const parts = args.trim().split(/\s+/);
  const subcommand = parts[0]?.toLowerCase() || 'list';
  const rest = parts.slice(1).join(' ');
  return { subcommand, rest };
}

/**
 * Format skill entry for display.
 */
function formatEntry(entry: SkillEntry, index?: number): string {
  const prefix = index !== undefined ? `${index + 1}. ` : '• ';
  const successRate = Math.round(entry.successRate * 100);
  const tags = entry.tags.slice(0, 3).join(', ');

  return `${prefix}**${entry.name}** (${entry.id})\n` +
         `   Tags: ${tags || 'none'} | Success: ${successRate}% | Used: ${entry.usageCount}x`;
}

// =============================================================================
// Subcommand Handlers
// =============================================================================

/**
 * List skills.
 */
function handleList(args: string, cwd: string): CommandResult {
  const { paths, scope } = getPathsFromScope(args, cwd);

  // Check if skill directory exists
  ensureSkillDirectory(paths);

  const entries = getAllSkillEntries(paths);

  if (entries.length === 0) {
    return {
      success: true,
      output: `No skills found in ${scope} scope.\n\n` +
              `Skills are learned from successful task completions.\n` +
              `Use \`/skill list --global\` to check global skills.`,
    };
  }

  // Parse filter options
  const tagFilter = args.match(/--tag[=\s]+(\S+)/)?.[1];
  const sortBy = args.includes('--sort=usage') ? 'usage' :
                 args.includes('--sort=success') ? 'success' :
                 args.includes('--sort=recent') ? 'recent' : 'name';

  let filtered = entries;

  // Apply tag filter
  if (tagFilter) {
    filtered = filtered.filter(e =>
      e.tags.some(t => t.toLowerCase().includes(tagFilter.toLowerCase()))
    );
  }

  // Sort
  switch (sortBy) {
    case 'usage':
      filtered.sort((a, b) => b.usageCount - a.usageCount);
      break;
    case 'success':
      filtered.sort((a, b) => b.successRate - a.successRate);
      break;
    case 'recent':
      filtered.sort((a, b) =>
        new Date(b.lastUsed || 0).getTime() - new Date(a.lastUsed || 0).getTime()
      );
      break;
    default:
      filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Build output
  let output = `**Skills (${scope})**\n\n`;

  if (filtered.length === 0) {
    output += `No skills match the filters.\n`;
  } else {
    output += filtered.map((e, i) => formatEntry(e, i)).join('\n\n');
    output += `\n\n*${filtered.length} skill${filtered.length === 1 ? '' : 's'} total*`;
  }

  output += '\n\nUse `/skill show <id>` to view details.';

  return { success: true, output };
}

/**
 * Show skill details.
 */
function handleShow(args: string, cwd: string): CommandResult {
  const { paths } = getPathsFromScope(args, cwd);

  // Extract skill ID (first non-flag argument)
  const skillId = args.split(/\s+/)
    .filter(a => !a.startsWith('-'))
    .shift();

  if (!skillId) {
    return {
      success: false,
      error: 'Usage: /skill show <skill-id> [--global]',
    };
  }

  // Load skill
  const result = parseSkill(paths, skillId);

  if (!result.success || !result.skill) {
    return {
      success: false,
      error: `Skill not found: ${skillId}\n\nUse \`/skill list\` to see available skills.`,
    };
  }

  const skill = result.skill;

  // Format output
  let output = `# ${skill.name}\n\n`;
  output += `**ID:** ${skill.id}\n`;
  output += `**Version:** ${skill.version}\n`;
  output += `**Tags:** ${skill.tags.join(', ') || 'none'}\n`;
  output += `**Triggers:** ${skill.triggers.join(', ') || 'none'}\n`;
  output += `**Success Rate:** ${Math.round(skill.successRate * 100)}%\n`;
  output += `**Usage Count:** ${skill.usageCount}\n`;
  output += `**Created:** ${new Date(skill.created).toLocaleDateString()}\n`;
  output += `**Updated:** ${new Date(skill.updated).toLocaleDateString()}\n\n`;

  // When to Apply
  if (skill.content.whenToApply.length > 0) {
    output += `## When to Apply\n`;
    for (const item of skill.content.whenToApply) {
      output += `- ${item}\n`;
    }
    output += '\n';
  }

  // Approaches
  if (skill.content.approaches.length > 0) {
    output += `## Approaches\n`;
    for (const approach of skill.content.approaches) {
      output += `### ${approach.name}\n`;
      output += `${approach.description}\n`;
      if (approach.steps.length > 0) {
        output += '\nSteps:\n';
        for (let i = 0; i < approach.steps.length; i++) {
          output += `${i + 1}. ${approach.steps[i]}\n`;
        }
      }
      output += '\n';
    }
  }

  // Pitfalls
  if (skill.content.pitfalls.length > 0) {
    output += `## Pitfalls to Avoid\n`;
    for (const pitfall of skill.content.pitfalls) {
      output += `- **${pitfall.mistake}:** ${pitfall.avoidance}\n`;
    }
    output += '\n';
  }

  // Verification
  if (skill.content.verificationSteps.length > 0) {
    output += `## Verification Steps\n`;
    for (const step of skill.content.verificationSteps) {
      output += `- [ ] ${step}\n`;
    }
  }

  return { success: true, output };
}

/**
 * Apply a specific skill.
 */
function handleApply(args: string, cwd: string): CommandResult {
  const { paths } = getPathsFromScope(args, cwd);

  // Extract skill ID
  const skillId = args.split(/\s+/)
    .filter(a => !a.startsWith('-'))
    .shift();

  if (!skillId) {
    return {
      success: false,
      error: 'Usage: /skill apply <skill-id> [--global] [--compact]',
    };
  }

  // Load skill
  const result = parseSkill(paths, skillId);

  if (!result.success || !result.skill) {
    return {
      success: false,
      error: `Skill not found: ${skillId}`,
    };
  }

  const compact = args.includes('--compact') || args.includes('-c');
  const formatted = formatSkillForContext(result.skill, 1.0, { compact });

  let output = `**Applying Skill: ${result.skill.name}**\n\n`;
  output += `The following skill context has been prepared:\n\n`;
  output += '---\n';
  output += formatted;
  output += '\n---\n\n';
  output += `*Copy the above to include in your task context.*`;

  return { success: true, output };
}

/**
 * Delete a skill.
 */
function handleDelete(args: string, cwd: string): CommandResult {
  const { paths, scope } = getPathsFromScope(args, cwd);

  // Extract skill ID
  const skillId = args.split(/\s+/)
    .filter(a => !a.startsWith('-'))
    .shift();

  if (!skillId) {
    return {
      success: false,
      error: 'Usage: /skill delete <skill-id> [--global]',
    };
  }

  // Check if skill exists
  const entry = getFromRegistry(paths, skillId);

  if (!entry) {
    return {
      success: false,
      error: `Skill not found: ${skillId}`,
    };
  }

  // Require confirmation flag
  if (!args.includes('--confirm') && !args.includes('-y')) {
    return {
      success: false,
      error: `Are you sure you want to delete "${entry.name}"?\n\n` +
             `Use \`/skill delete ${skillId} --confirm\` to confirm deletion.`,
    };
  }

  // Remove from registry (file deletion would need fs operations)
  const removed = removeFromRegistry(paths, skillId);

  if (removed) {
    return {
      success: true,
      output: `Skill "${entry.name}" (${skillId}) has been removed from the ${scope} registry.`,
    };
  } else {
    return {
      success: false,
      error: `Failed to delete skill: ${skillId}`,
    };
  }
}

/**
 * Show skill statistics.
 */
function handleStats(args: string, cwd: string): CommandResult {
  const { paths, scope } = getPathsFromScope(args, cwd);

  ensureSkillDirectory(paths);
  const entries = getAllSkillEntries(paths);

  if (entries.length === 0) {
    return {
      success: true,
      output: `**Skill Statistics (${scope})**\n\n` +
              `No skills found. Skills are created from successful task completions.`,
    };
  }

  // Calculate stats
  const totalSkills = entries.length;
  const totalUsage = entries.reduce((sum, e) => sum + e.usageCount, 0);
  const avgSuccessRate = entries.reduce((sum, e) => sum + e.successRate, 0) / totalSkills;

  // Tag frequency
  const tagCounts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Most used skills
  const mostUsed = [...entries]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 3);

  // Build output
  let output = `**Skill Statistics (${scope})**\n\n`;
  output += `**Overview**\n`;
  output += `  Total Skills: ${totalSkills}\n`;
  output += `  Total Usage: ${totalUsage}\n`;
  output += `  Avg Success Rate: ${Math.round(avgSuccessRate * 100)}%\n\n`;

  if (topTags.length > 0) {
    output += `**Top Tags**\n`;
    for (const [tag, count] of topTags) {
      output += `  - ${tag}: ${count} skill${count === 1 ? '' : 's'}\n`;
    }
    output += '\n';
  }

  if (mostUsed.length > 0) {
    output += `**Most Used Skills**\n`;
    for (const entry of mostUsed) {
      output += `  - ${entry.name}: ${entry.usageCount}x\n`;
    }
  }

  return { success: true, output };
}

/**
 * Search for skills.
 */
function handleSearch(args: string, cwd: string): CommandResult {
  const { paths, scope } = getPathsFromScope(args, cwd);

  // Extract query
  const query = args.split(/\s+/)
    .filter(a => !a.startsWith('-'))
    .join(' ')
    .trim();

  if (!query) {
    return {
      success: false,
      error: 'Usage: /skill search <query> [--global]',
    };
  }

  ensureSkillDirectory(paths);
  const suggestions = getSkillSuggestions(paths, query, 10);

  if (suggestions.length === 0) {
    return {
      success: true,
      output: `No skills found matching "${query}" in ${scope} scope.`,
    };
  }

  let output = `**Search Results for "${query}" (${scope})**\n\n`;
  output += suggestions.map((e, i) => formatEntry(e, i)).join('\n\n');
  output += `\n\n*${suggestions.length} result${suggestions.length === 1 ? '' : 's'}*`;

  return { success: true, output };
}

// =============================================================================
// Main Command Handler
// =============================================================================

/**
 * Skill command handler.
 */
function skillHandler(args: string, _context: CommandContext): CommandResult {
  const { subcommand, rest } = parseSubcommand(args);
  const cwd = process.cwd();

  switch (subcommand) {
    case 'list':
    case 'ls':
      return handleList(rest, cwd);

    case 'show':
    case 'view':
    case 'get':
      return handleShow(rest, cwd);

    case 'apply':
    case 'use':
      return handleApply(rest, cwd);

    case 'delete':
    case 'rm':
    case 'remove':
      return handleDelete(rest, cwd);

    case 'stats':
    case 'statistics':
      return handleStats(rest, cwd);

    case 'search':
    case 'find':
      return handleSearch(rest, cwd);

    case 'help':
    case '?':
      return {
        success: true,
        output: `**Skill Commands**\n\n` +
                `\`/skill list [--global] [--tag=<tag>] [--sort=name|usage|success|recent]\`\n` +
                `  List all skills\n\n` +
                `\`/skill show <id> [--global]\`\n` +
                `  Show skill details\n\n` +
                `\`/skill apply <id> [--global] [--compact]\`\n` +
                `  Get skill context for injection\n\n` +
                `\`/skill delete <id> [--global] --confirm\`\n` +
                `  Delete a skill\n\n` +
                `\`/skill stats [--global]\`\n` +
                `  Show skill statistics\n\n` +
                `\`/skill search <query> [--global]\`\n` +
                `  Search for skills\n\n` +
                `**Flags:**\n` +
                `  --global, -g    Use global skills (~/.yoyo-ai/.skills/)\n` +
                `  --compact, -c   Use compact format for apply\n` +
                `  --confirm, -y   Confirm deletion`,
      };

    default:
      // If subcommand looks like a skill ID, assume show
      if (subcommand && !subcommand.startsWith('-')) {
        return handleShow(args, cwd);
      }

      return {
        success: false,
        error: `Unknown subcommand: ${subcommand}\n\nUse \`/skill help\` for available commands.`,
      };
  }
}

// =============================================================================
// Command Definition
// =============================================================================

/**
 * Skill command definition.
 */
export const skillCommand: CommandDefinition = {
  name: 'skill',
  aliases: ['skills', 'sk'],
  description: 'Manage learned skills',
  usage: '/skill <subcommand> [options]',
  handler: skillHandler,
};
