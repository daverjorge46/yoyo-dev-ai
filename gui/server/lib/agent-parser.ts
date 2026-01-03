/**
 * Agent Markdown Parser
 *
 * Parses agent definition files from .claude/agents/*.md
 * Extracts YAML frontmatter and markdown content.
 */

import * as yaml from 'js-yaml';
import type { Agent, AgentSummary } from '../../shared/types/agent.js';

// =============================================================================
// Types
// =============================================================================

interface ParsedFrontmatter {
  name?: string;
  description?: string;
}

interface ParsedContent {
  model: string;
  temperature: number;
  mode: 'Primary' | 'Subagent';
  version: string;
  tools: string;
  outputPrefix: string;
  fallbackModel?: string;
}

// =============================================================================
// Frontmatter Parsing
// =============================================================================

/**
 * Extract YAML frontmatter from markdown content
 */
export function extractFrontmatter(content: string): { frontmatter: ParsedFrontmatter; body: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    return {
      frontmatter: {},
      body: content,
    };
  }

  try {
    const frontmatter = yaml.load(frontmatterMatch[1]) as ParsedFrontmatter;
    const body = content.slice(frontmatterMatch[0].length).trim();

    return {
      frontmatter: frontmatter || {},
      body,
    };
  } catch {
    return {
      frontmatter: {},
      body: content,
    };
  }
}

// =============================================================================
// Content Parsing
// =============================================================================

/**
 * Extract model from markdown content
 * Looks for patterns like: **Model:** Claude Opus 4.5
 */
function extractModel(content: string): string {
  // Try to match **Model:** pattern
  const modelMatch = content.match(/\*\*Model:\*\*\s*([^\n(]+)/i);
  if (modelMatch) {
    const modelText = modelMatch[1].trim();
    // Map common names to model IDs
    if (modelText.toLowerCase().includes('opus')) {
      return 'claude-opus-4-5-20250514';
    }
    if (modelText.toLowerCase().includes('sonnet')) {
      return 'claude-sonnet-4-20250514';
    }
    return modelText;
  }

  return 'claude-sonnet-4-20250514';
}

/**
 * Extract temperature from markdown content
 * Looks for patterns like: **Temperature:** 1.0
 */
function extractTemperature(content: string): number {
  const tempMatch = content.match(/\*\*Temperature:\*\*\s*([\d.]+)/i);
  if (tempMatch) {
    const temp = parseFloat(tempMatch[1]);
    if (!isNaN(temp) && temp >= 0 && temp <= 2) {
      return temp;
    }
  }

  return 0.7;
}

/**
 * Extract mode from markdown content
 * Looks for patterns like: **Mode:** Primary Agent
 */
function extractMode(content: string): 'Primary' | 'Subagent' {
  const modeMatch = content.match(/\*\*Mode:\*\*\s*([^\n]+)/i);
  if (modeMatch) {
    const modeText = modeMatch[1].trim().toLowerCase();
    if (modeText.includes('primary')) {
      return 'Primary';
    }
  }

  return 'Subagent';
}

/**
 * Extract version from markdown content
 * Looks for patterns like: **Version:** 6.1.0
 */
function extractVersion(content: string): string {
  const versionMatch = content.match(/\*\*Version:\*\*\s*([\d.]+)/i);
  if (versionMatch) {
    return versionMatch[1].trim();
  }

  return '1.0.0';
}

/**
 * Extract output prefix from markdown content
 * Looks for patterns like: [agent-name]
 */
function extractOutputPrefix(content: string): string {
  // Look for prefix pattern in output requirements section
  const prefixMatch = content.match(/\[([a-z-]+)\]/);
  if (prefixMatch) {
    return `[${prefixMatch[1]}]`;
  }

  return '';
}

/**
 * Extract tool access from markdown content
 */
function extractTools(content: string): string {
  if (content.includes('FULL access to all tools') || content.includes('Tools: *')) {
    return '*';
  }
  if (content.includes('READ-ONLY access') || content.includes('read-only')) {
    return 'read-only';
  }

  return 'standard';
}

/**
 * Extract fallback model from content
 */
function extractFallbackModel(content: string): string | undefined {
  const fallbackMatch = content.match(/fallback[^:]*:\s*([^\n)]+)/i);
  if (fallbackMatch) {
    const fallbackText = fallbackMatch[1].trim();
    if (fallbackText.toLowerCase().includes('sonnet')) {
      return 'claude-sonnet-4-20250514';
    }
  }

  return undefined;
}

/**
 * Parse all metadata from content body
 */
function parseContent(content: string): ParsedContent {
  return {
    model: extractModel(content),
    temperature: extractTemperature(content),
    mode: extractMode(content),
    version: extractVersion(content),
    tools: extractTools(content),
    outputPrefix: extractOutputPrefix(content),
    fallbackModel: extractFallbackModel(content),
  };
}

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Parse an agent markdown file into an Agent object
 */
export function parseAgentFile(
  content: string,
  filename: string,
  filePath: string
): Agent {
  const { frontmatter, body } = extractFrontmatter(content);
  const parsed = parseContent(body);

  // Generate ID from filename (remove .md extension)
  const id = filename.replace(/\.md$/, '');

  // Get name from frontmatter or derive from ID
  const name = frontmatter.name || id.split('-').map(
    word => word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  // Get description from frontmatter or use a default
  const description = frontmatter.description || 'Agent definition';

  return {
    id,
    name,
    description,
    model: parsed.model,
    temperature: parsed.temperature,
    mode: parsed.mode,
    version: parsed.version,
    tools: parsed.tools,
    outputPrefix: parsed.outputPrefix,
    fallbackModel: parsed.fallbackModel,
    content,
    filePath,
  };
}

/**
 * Convert Agent to AgentSummary for list views
 */
export function toAgentSummary(agent: Agent): AgentSummary {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    model: agent.model,
    temperature: agent.temperature,
    mode: agent.mode,
    status: 'idle',
  };
}

// =============================================================================
// Markdown Generation
// =============================================================================

/**
 * Generate markdown content from agent form data
 */
export function generateAgentMarkdown(data: {
  name: string;
  description: string;
  model: string;
  temperature: number;
  mode: 'Primary' | 'Subagent';
  content: string;
  outputPrefix?: string;
  fallbackModel?: string;
}): string {
  const frontmatter = yaml.dump({
    name: data.name.toLowerCase().replace(/\s+/g, '-'),
    description: data.description,
  });

  const modelDisplay = data.model.includes('opus') ? 'Claude Opus 4.5' :
                      data.model.includes('sonnet') ? 'Claude Sonnet 4' :
                      data.model;

  const fallbackDisplay = data.fallbackModel ?
    `, ${data.fallbackModel.includes('sonnet') ? 'Sonnet 4.5' : data.fallbackModel} (fallback)` : '';

  const header = `# ${data.name}

**Model:** ${modelDisplay}${fallbackDisplay}
**Temperature:** ${data.temperature}
**Mode:** ${data.mode}
**Version:** 1.0.0

---`;

  return `---
${frontmatter.trim()}
---

${header}

${data.content}`;
}

/**
 * Generate a valid ID from a name
 */
export function nameToId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
