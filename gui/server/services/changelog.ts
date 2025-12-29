/**
 * Changelog Service
 *
 * Generates changelogs from spec files (spec.md, tasks.md, decisions.md).
 * Supports multiple output formats: Keep a Changelog, Conventional Commits, Plain text.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// Types
// =============================================================================

export type ChangelogFormat = 'keepachangelog' | 'conventional' | 'plain';

export type ChangelogCategory = 'Added' | 'Changed' | 'Fixed' | 'Removed';

export interface ChangelogEntry {
  text: string;
  category: ChangelogCategory;
  source: 'spec' | 'tasks' | 'decisions';
}

export interface ChangelogSection {
  type: ChangelogCategory;
  entries: string[];
}

export interface GeneratedChangelog {
  changelog: string;
  sections: ChangelogSection[];
  specId: string;
  generatedAt: string;
}

interface SpecData {
  spec: string | null;
  tasks: string | null;
  decisions: string | null;
}

// =============================================================================
// Entry Detection
// =============================================================================

/**
 * Detects the changelog category based on keywords in the text.
 */
function detectCategory(text: string): ChangelogCategory {
  const lowerText = text.toLowerCase();

  // Added patterns
  if (/\b(add|create|new|implement|introduce|build)\b/.test(lowerText)) {
    return 'Added';
  }

  // Fixed patterns
  if (/\b(fix|resolve|repair|correct|patch|bug)\b/.test(lowerText)) {
    return 'Fixed';
  }

  // Removed patterns
  if (/\b(remove|delete|deprecate|drop|eliminate)\b/.test(lowerText)) {
    return 'Removed';
  }

  // Changed patterns (also the default)
  if (/\b(update|modify|change|enhance|improve|refactor|optimize)\b/.test(lowerText)) {
    return 'Changed';
  }

  // Default to Changed for unrecognized patterns
  return 'Changed';
}

/**
 * Extracts changelog entries from spec.md content.
 */
function extractFromSpec(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];

  // Extract title (first h1)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    entries.push({
      text: titleMatch[1].trim(),
      category: detectCategory(titleMatch[1]),
      source: 'spec',
    });
  }

  // Extract deliverables section
  const deliverablesMatch = content.match(/##\s*Deliverables[\s\S]*?(?=##|$)/i);
  if (deliverablesMatch) {
    const items = deliverablesMatch[0].match(/^[-*]\s+(.+)$/gm);
    if (items) {
      for (const item of items) {
        const text = item.replace(/^[-*]\s+/, '').trim();
        if (text && !text.startsWith('_')) {
          entries.push({
            text,
            category: detectCategory(text),
            source: 'spec',
          });
        }
      }
    }
  }

  return entries;
}

/**
 * Extracts changelog entries from tasks.md content.
 * Focuses on completed tasks (checked items).
 */
function extractFromTasks(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];

  // Match checked task items: - [x] Task description
  const checkedTasks = content.match(/^-\s*\[x\]\s+(.+)$/gim);
  if (checkedTasks) {
    for (const task of checkedTasks) {
      const text = task.replace(/^-\s*\[x\]\s+/i, '').trim();
      if (text) {
        entries.push({
          text,
          category: detectCategory(text),
          source: 'tasks',
        });
      }
    }
  }

  // Also extract parent task titles (## Parent Task X: Description)
  const parentTasks = content.match(/^##\s*Parent Task\s*\d+:\s*(.+)$/gim);
  if (parentTasks) {
    for (const task of parentTasks) {
      const text = task.replace(/^##\s*Parent Task\s*\d+:\s*/i, '').trim();
      if (text) {
        entries.push({
          text,
          category: detectCategory(text),
          source: 'tasks',
        });
      }
    }
  }

  return entries;
}

/**
 * Extracts changelog entries from decisions.md content.
 */
function extractFromDecisions(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];

  // Extract decision headers (### Decision Title)
  const decisions = content.match(/^###\s+(.+)$/gm);
  if (decisions) {
    for (const decision of decisions) {
      const text = decision.replace(/^###\s+/, '').trim();
      // Skip generic headers
      if (text && !text.toLowerCase().includes('initial setup')) {
        entries.push({
          text,
          category: 'Changed',
          source: 'decisions',
        });
      }
    }
  }

  return entries;
}

// =============================================================================
// Format Generators
// =============================================================================

/**
 * Groups entries by category.
 */
function groupByCategory(entries: ChangelogEntry[]): ChangelogSection[] {
  const categories: ChangelogCategory[] = ['Added', 'Changed', 'Fixed', 'Removed'];
  const grouped = new Map<ChangelogCategory, string[]>();

  for (const category of categories) {
    grouped.set(category, []);
  }

  for (const entry of entries) {
    const list = grouped.get(entry.category);
    if (list && !list.includes(entry.text)) {
      list.push(entry.text);
    }
  }

  return categories
    .filter((cat) => grouped.get(cat)!.length > 0)
    .map((type) => ({
      type,
      entries: grouped.get(type)!,
    }));
}

/**
 * Generates changelog in Keep a Changelog format.
 * https://keepachangelog.com/
 */
function formatKeepAChangelog(
  sections: ChangelogSection[],
  specId: string
): string {
  const date = new Date().toISOString().split('T')[0];
  const lines: string[] = [
    '# Changelog',
    '',
    'All notable changes to this project will be documented in this file.',
    '',
    'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),',
    'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
    '',
    `## [Unreleased] - ${date}`,
    '',
    `> Generated from spec: ${specId}`,
    '',
  ];

  for (const section of sections) {
    lines.push(`### ${section.type}`);
    lines.push('');
    for (const entry of section.entries) {
      lines.push(`- ${entry}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generates changelog in Conventional Commits format.
 * https://www.conventionalcommits.org/
 */
function formatConventionalCommits(
  sections: ChangelogSection[],
  specId: string
): string {
  const date = new Date().toISOString().split('T')[0];
  const typeMap: Record<ChangelogCategory, string> = {
    Added: 'feat',
    Changed: 'refactor',
    Fixed: 'fix',
    Removed: 'chore',
  };

  const lines: string[] = [
    '# Changelog',
    '',
    `## ${date}`,
    '',
    `> Generated from spec: ${specId}`,
    '',
  ];

  for (const section of sections) {
    const type = typeMap[section.type];
    for (const entry of section.entries) {
      // Convert to lowercase and create conventional commit format
      const scope = specId.split('-').slice(3).join('-').slice(0, 20);
      lines.push(`- ${type}(${scope}): ${entry.toLowerCase()}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generates changelog in plain text format.
 */
function formatPlainText(
  sections: ChangelogSection[],
  specId: string
): string {
  const date = new Date().toISOString().split('T')[0];
  const lines: string[] = [
    `CHANGELOG - ${date}`,
    `Spec: ${specId}`,
    '',
    '='.repeat(50),
    '',
  ];

  for (const section of sections) {
    lines.push(`${section.type.toUpperCase()}`);
    lines.push('-'.repeat(section.type.length));
    for (const entry of section.entries) {
      lines.push(`  * ${entry}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// =============================================================================
// Main Service
// =============================================================================

/**
 * Reads spec data files from the spec directory.
 */
function readSpecData(projectRoot: string, specId: string): SpecData {
  const specDir = join(projectRoot, '.yoyo-dev', 'specs', specId);

  const data: SpecData = {
    spec: null,
    tasks: null,
    decisions: null,
  };

  const specPath = join(specDir, 'spec.md');
  if (existsSync(specPath)) {
    data.spec = readFileSync(specPath, 'utf-8');
  }

  const tasksPath = join(specDir, 'tasks.md');
  if (existsSync(tasksPath)) {
    data.tasks = readFileSync(tasksPath, 'utf-8');
  }

  const decisionsPath = join(specDir, 'decisions.md');
  if (existsSync(decisionsPath)) {
    data.decisions = readFileSync(decisionsPath, 'utf-8');
  }

  return data;
}

/**
 * Generates a changelog from a spec's files.
 */
export function generateChangelog(
  projectRoot: string,
  specId: string,
  format: ChangelogFormat
): GeneratedChangelog {
  // Read spec data
  const data = readSpecData(projectRoot, specId);

  // Extract entries from each source
  const entries: ChangelogEntry[] = [];

  if (data.spec) {
    entries.push(...extractFromSpec(data.spec));
  }

  if (data.tasks) {
    entries.push(...extractFromTasks(data.tasks));
  }

  if (data.decisions) {
    entries.push(...extractFromDecisions(data.decisions));
  }

  // Group entries by category
  const sections = groupByCategory(entries);

  // Generate formatted changelog
  let changelog: string;
  switch (format) {
    case 'keepachangelog':
      changelog = formatKeepAChangelog(sections, specId);
      break;
    case 'conventional':
      changelog = formatConventionalCommits(sections, specId);
      break;
    case 'plain':
      changelog = formatPlainText(sections, specId);
      break;
    default:
      changelog = formatKeepAChangelog(sections, specId);
  }

  return {
    changelog,
    sections,
    specId,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Validates that a spec exists and has required files.
 */
export function validateSpec(projectRoot: string, specId: string): boolean {
  const specDir = join(projectRoot, '.yoyo-dev', 'specs', specId);
  return existsSync(specDir);
}
