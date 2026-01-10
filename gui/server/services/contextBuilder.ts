/**
 * Context Builder Service
 *
 * Builds context for terminal injection from:
 * - Task description and spec-lite.md
 * - Codebase context (relevant files)
 * - Memory context (learned patterns)
 * - Tech stack context
 */

import { join } from 'path';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import type { TerminalContext } from '../types/terminal.js';

// =============================================================================
// Types
// =============================================================================

export interface TaskInfo {
  taskId: string;
  specId: string;
  title: string;
  description?: string;
  subtasks?: string[];
}

export interface ContextBuilderOptions {
  projectRoot: string;
  maxCodebaseContextLength?: number;
  maxMemoryContextLength?: number;
}

// =============================================================================
// Context Builder Class
// =============================================================================

export class ContextBuilder {
  private projectRoot: string;
  private maxCodebaseContextLength: number;
  private maxMemoryContextLength: number;

  constructor(options: ContextBuilderOptions) {
    this.projectRoot = options.projectRoot;
    this.maxCodebaseContextLength = options.maxCodebaseContextLength ?? 10000;
    this.maxMemoryContextLength = options.maxMemoryContextLength ?? 5000;
  }

  // ===========================================================================
  // Main Build Methods
  // ===========================================================================

  /**
   * Build full context for a task
   */
  async buildTaskContext(task: TaskInfo): Promise<TerminalContext> {
    const [specSummary, techStackContext, codebaseContext, memoryContext] = await Promise.all([
      this.buildSpecContext(task.specId),
      this.buildTechStackContext(),
      this.buildCodebaseContext(task.title, task.description),
      this.buildMemoryContext(task.title),
    ]);

    return {
      specSummary,
      taskDescription: this.formatTaskDescription(task),
      codebaseContext,
      memoryContext,
      techStackContext,
    };
  }

  /**
   * Build context from spec-lite.md
   */
  async buildSpecContext(specId: string): Promise<string | undefined> {
    const specDir = join(this.projectRoot, '.yoyo-dev', 'specs', specId);
    const specLitePath = join(specDir, 'spec-lite.md');
    const specPath = join(specDir, 'spec.md');

    // Try spec-lite.md first
    if (existsSync(specLitePath)) {
      return readFileSync(specLitePath, 'utf-8');
    }

    // Fall back to spec.md (truncated)
    if (existsSync(specPath)) {
      const content = readFileSync(specPath, 'utf-8');
      // Return first 5000 chars if too long
      if (content.length > 5000) {
        return content.slice(0, 5000) + '\n\n[... truncated ...]';
      }
      return content;
    }

    return undefined;
  }

  /**
   * Build tech stack context
   */
  async buildTechStackContext(): Promise<string | undefined> {
    const techStackPath = join(this.projectRoot, '.yoyo-dev', 'product', 'tech-stack.md');

    if (existsSync(techStackPath)) {
      return readFileSync(techStackPath, 'utf-8');
    }

    // Try config.yml for basic tech stack info
    const configPath = join(this.projectRoot, '.yoyo-dev', 'config.yml');
    if (existsSync(configPath)) {
      const config = readFileSync(configPath, 'utf-8');
      const techStackMatch = config.match(/tech_stack:[\s\S]*?(?=\n\w|$)/);
      if (techStackMatch) {
        return `# Tech Stack (from config)\n\n${techStackMatch[0]}`;
      }
    }

    return undefined;
  }

  /**
   * Build codebase context based on task keywords
   */
  async buildCodebaseContext(
    title: string,
    description?: string
  ): Promise<string | undefined> {
    const keywords = this.extractKeywords(title, description);
    if (keywords.length === 0) return undefined;

    const relevantFiles = await this.findRelevantFiles(keywords);
    if (relevantFiles.length === 0) return undefined;

    const context: string[] = ['# Relevant Codebase Files\n'];
    let totalLength = 0;

    for (const file of relevantFiles) {
      if (totalLength >= this.maxCodebaseContextLength) break;

      try {
        const content = readFileSync(file, 'utf-8');
        const relativePath = file.replace(this.projectRoot + '/', '');

        // Add file header and content
        const fileSection = `## ${relativePath}\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\`\n`;

        if (totalLength + fileSection.length <= this.maxCodebaseContextLength) {
          context.push(fileSection);
          totalLength += fileSection.length;
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return context.length > 1 ? context.join('\n') : undefined;
  }

  /**
   * Build memory context from learned patterns
   */
  async buildMemoryContext(_taskDescription: string): Promise<string | undefined> {
    // Try to read from memory store
    const memoryDir = join(this.projectRoot, '.yoyo-dev', 'memory');

    if (!existsSync(memoryDir)) return undefined;

    try {
      const files = readdirSync(memoryDir).filter(f => f.endsWith('.json'));
      if (files.length === 0) return undefined;

      const patterns: string[] = ['# Learned Patterns\n'];
      let totalLength = 0;

      for (const file of files.slice(0, 10)) {
        // Limit to 10 files
        if (totalLength >= this.maxMemoryContextLength) break;

        try {
          const content = JSON.parse(readFileSync(join(memoryDir, file), 'utf-8'));
          if (content.type === 'corrections' || content.type === 'project') {
            const summary = this.summarizeMemoryBlock(content);
            if (summary && totalLength + summary.length <= this.maxMemoryContextLength) {
              patterns.push(summary);
              totalLength += summary.length;
            }
          }
        } catch {
          // Skip invalid files
        }
      }

      return patterns.length > 1 ? patterns.join('\n') : undefined;
    } catch {
      return undefined;
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Format task description with subtasks
   */
  private formatTaskDescription(task: TaskInfo): string {
    const lines: string[] = [
      `# Task: ${task.title}`,
      '',
    ];

    if (task.description) {
      lines.push(task.description, '');
    }

    if (task.subtasks && task.subtasks.length > 0) {
      lines.push('## Subtasks', '');
      for (const subtask of task.subtasks) {
        lines.push(`- [ ] ${subtask}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Extract keywords from task title and description
   */
  private extractKeywords(title: string, description?: string): string[] {
    const text = `${title} ${description || ''}`.toLowerCase();

    // Common words to exclude
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
      'these', 'those', 'it', 'its', 'add', 'create', 'implement', 'update',
      'fix', 'remove', 'delete', 'modify', 'change', 'make', 'new',
    ]);

    const words = text
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    return [...new Set(words)].slice(0, 10); // Max 10 keywords
  }

  /**
   * Find files relevant to keywords
   */
  private async findRelevantFiles(keywords: string[]): Promise<string[]> {
    const relevantFiles: string[] = [];
    const searchDirs = ['src', 'lib', 'components', 'pages', 'hooks', 'services', 'utils'];

    for (const dir of searchDirs) {
      const dirPath = join(this.projectRoot, dir);
      if (existsSync(dirPath)) {
        this.searchDirectory(dirPath, keywords, relevantFiles);
      }
    }

    // Also check gui directories
    const guiDir = join(this.projectRoot, 'gui');
    if (existsSync(guiDir)) {
      for (const subDir of ['client/src', 'server']) {
        const subDirPath = join(guiDir, subDir);
        if (existsSync(subDirPath)) {
          this.searchDirectory(subDirPath, keywords, relevantFiles);
        }
      }
    }

    return relevantFiles.slice(0, 10); // Max 10 files
  }

  /**
   * Recursively search directory for files matching keywords
   */
  private searchDirectory(dir: string, keywords: string[], results: string[]): void {
    if (results.length >= 10) return;

    try {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        if (results.length >= 10) break;
        if (entry.startsWith('.') || entry === 'node_modules') continue;

        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          this.searchDirectory(fullPath, keywords, results);
        } else if (stat.isFile()) {
          const ext = entry.split('.').pop()?.toLowerCase();
          if (!['ts', 'tsx', 'js', 'jsx', 'md'].includes(ext || '')) continue;

          // Check if filename contains any keyword
          const fileName = entry.toLowerCase();
          if (keywords.some(kw => fileName.includes(kw))) {
            results.push(fullPath);
          }
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  /**
   * Summarize a memory block
   */
  private summarizeMemoryBlock(block: Record<string, unknown>): string | undefined {
    if (block.type === 'corrections' && block.content) {
      const content = block.content as Record<string, unknown>;
      if (content.corrections && Array.isArray(content.corrections)) {
        return content.corrections
          .slice(0, 3)
          .map((c: Record<string, unknown>) => `- ${c.original} → ${c.corrected}`)
          .join('\n');
      }
    }

    if (block.type === 'project' && block.content) {
      const content = block.content as Record<string, unknown>;
      if (content.patterns && Array.isArray(content.patterns)) {
        return `Patterns: ${(content.patterns as string[]).slice(0, 5).join(', ')}`;
      }
    }

    return undefined;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let builderInstance: ContextBuilder | null = null;

export function getContextBuilder(projectRoot: string): ContextBuilder {
  if (!builderInstance) {
    builderInstance = new ContextBuilder({ projectRoot });
  }
  return builderInstance;
}
