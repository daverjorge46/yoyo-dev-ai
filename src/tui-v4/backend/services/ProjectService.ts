/**
 * ProjectService
 *
 * Loads project information from .yoyo-dev/product/ directory:
 * - Project name from mission-lite.md header
 * - Description/tagline
 * - Key tech stack items
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';

export interface ProjectInfo {
  name: string;
  tagline: string;
  techStack: string[];
}

const DEFAULT_PROJECT_INFO: ProjectInfo = {
  name: 'Yoyo Dev',
  tagline: 'AI Development Framework',
  techStack: [],
};

/**
 * Extract project name from mission-lite.md title (e.g., "# Yoyo AI - Mission")
 */
function extractProjectName(content: string): string {
  const titleMatch = content.match(/^#\s+(.+?)(?:\s+-\s+|\s*$)/m);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }
  return DEFAULT_PROJECT_INFO.name;
}

/**
 * Extract tagline from mission-lite.md (looks for "**Tagline:**" line)
 */
function extractTagline(content: string): string {
  const taglineMatch = content.match(/\*\*Tagline:\*\*\s*"?(.+?)"?\s*$/m);
  if (taglineMatch && taglineMatch[1]) {
    return taglineMatch[1].replace(/"/g, '').trim();
  }
  // Fallback: look for "What is X?" section description
  const whatIsMatch = content.match(/A\s+\*\*([^*]+)\*\*/);
  if (whatIsMatch && whatIsMatch[1]) {
    return whatIsMatch[1].trim();
  }
  return DEFAULT_PROJECT_INFO.tagline;
}

/**
 * Extract key tech stack items from tech-stack.md
 */
function extractTechStack(content: string): string[] {
  const techStack: string[] = [];

  // Look for "**Runtime**: X" or "**Framework**: X" patterns
  const runtimeMatch = content.match(/\*\*Runtime\*\*:\s*(.+?)(?:\(|$)/m);
  if (runtimeMatch && runtimeMatch[1]) {
    techStack.push(runtimeMatch[1].trim());
  }

  const frameworkMatch = content.match(/\*\*Framework\*\*:\s*(.+?)(?:for|$)/m);
  if (frameworkMatch && frameworkMatch[1]) {
    techStack.push(frameworkMatch[1].trim());
  }

  // Look for common tech mentions
  if (content.includes('TypeScript')) techStack.push('TypeScript');
  if (content.includes('SQLite')) techStack.push('SQLite');
  if (content.includes('React') && !techStack.some(t => t.includes('React'))) {
    techStack.push('React');
  }

  // Return unique items, max 4
  return [...new Set(techStack)].slice(0, 4);
}

class ProjectService {
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * Get project information from .yoyo-dev/product/ directory
   */
  async getProjectInfo(): Promise<ProjectInfo> {
    const productDir = path.join(this.projectRoot, '.yoyo-dev', 'product');
    const missionLitePath = path.join(productDir, 'mission-lite.md');
    const techStackPath = path.join(productDir, 'tech-stack.md');

    let projectInfo: ProjectInfo = { ...DEFAULT_PROJECT_INFO };

    try {
      // Read mission-lite.md for name and tagline
      if (existsSync(missionLitePath)) {
        const missionContent = await readFile(missionLitePath, 'utf-8');
        projectInfo.name = extractProjectName(missionContent);
        projectInfo.tagline = extractTagline(missionContent);
      }

      // Read tech-stack.md for tech stack items
      if (existsSync(techStackPath)) {
        const techContent = await readFile(techStackPath, 'utf-8');
        projectInfo.techStack = extractTechStack(techContent);
      }
    } catch (error) {
      // Return defaults on error
      console.error('Failed to load project info:', error);
    }

    return projectInfo;
  }

  /**
   * Check if this is a Yoyo Dev project (has .yoyo-dev directory)
   */
  isYoyoProject(): boolean {
    return existsSync(path.join(this.projectRoot, '.yoyo-dev'));
  }
}

export const projectService = new ProjectService();
