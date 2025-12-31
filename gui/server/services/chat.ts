/**
 * Chat Service
 *
 * Handles Claude API integration for codebase chat.
 * Gracefully handles missing API key with placeholder response.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

// =============================================================================
// Types
// =============================================================================

export interface ChatContext {
  role: 'user' | 'assistant';
  content: string;
}

export interface FileReference {
  path: string;
  lineNumber?: number;
  endLineNumber?: number;
  snippet?: string;
}

export interface ChatRequest {
  message: string;
  context?: ChatContext[];
}

export interface ChatResponse {
  response: string;
  references: FileReference[];
}

// =============================================================================
// Configuration
// =============================================================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MAX_RESPONSE_TOKENS = 4096;
const MODEL = 'claude-sonnet-4-20250514';

// System prompt for codebase analysis
const SYSTEM_PROMPT = `You are an expert software developer assistant analyzing a codebase. Your role is to:

1. Answer questions about the codebase structure, patterns, and implementations
2. Explain how specific features or components work
3. Help users understand code architecture and design decisions
4. Provide relevant code references when discussing files

When referencing files, use this format: [FILE:path/to/file.ts] or [FILE:path/to/file.ts:42] for specific lines.

Be concise but thorough. Use code blocks with appropriate language tags when showing code.
Focus on being helpful and accurate. If you're not sure about something, say so.`;

// =============================================================================
// Service
// =============================================================================

export class ChatService {
  private client: Anthropic | null = null;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;

    // Initialize Anthropic client if API key is available
    if (ANTHROPIC_API_KEY) {
      this.client = new Anthropic({
        apiKey: ANTHROPIC_API_KEY,
      });
    }
  }

  /**
   * Check if the chat service is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Update API key and reinitialize client
   * @param apiKey - The new Anthropic API key
   * @returns Promise<boolean> - true if key is valid and client initialized, false otherwise
   */
  async updateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Validate API key format
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        this.client = null;
        return false;
      }

      // Create new Anthropic client
      const newClient = new Anthropic({
        apiKey: apiKey.trim(),
      });

      // Validate API key with test request (lightweight validation)
      await newClient.messages.create({
        model: MODEL,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'test',
          },
        ],
      });

      // If validation succeeds, update the client
      this.client = newClient;
      return true;
    } catch (error) {
      // API key is invalid or request failed
      console.error('[ChatService] API key validation failed:', error instanceof Error ? error.message : error);
      this.client = null;
      return false;
    }
  }

  /**
   * Send a chat message and get a response
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // Handle missing API key
    if (!this.client) {
      return this.getPlaceholderResponse();
    }

    try {
      // Build conversation history
      const messages = this.buildMessages(request);

      // Get project context for system prompt
      const projectContext = this.getProjectContext();

      // Send request to Claude
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_RESPONSE_TOKENS,
        system: `${SYSTEM_PROMPT}\n\n## Project Context\n${projectContext}`,
        messages,
      });

      // Extract text response
      const textContent = response.content.find((block) => block.type === 'text');
      const responseText = textContent?.type === 'text' ? textContent.text : '';

      // Extract file references from response
      const references = this.extractFileReferences(responseText);

      return {
        response: responseText,
        references,
      };
    } catch (error) {
      console.error('[ChatService] Error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to get response from Claude'
      );
    }
  }

  /**
   * Build messages array for API request
   */
  private buildMessages(request: ChatRequest): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation context if provided
    if (request.context) {
      for (const ctx of request.context) {
        messages.push({
          role: ctx.role,
          content: ctx.content,
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: request.message,
    });

    return messages;
  }

  /**
   * Get project context for Claude
   */
  private getProjectContext(): string {
    const parts: string[] = [];

    // Add project name from package.json
    const pkgPath = join(this.projectRoot, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        parts.push(`Project: ${pkg.name || 'Unknown'}`);
        if (pkg.description) {
          parts.push(`Description: ${pkg.description}`);
        }
      } catch {
        // Ignore
      }
    }

    // Add framework info
    const yoyoDevPath = join(this.projectRoot, '.yoyo-dev');
    if (existsSync(yoyoDevPath)) {
      parts.push('Framework: Yoyo Dev (AI-assisted development workflow)');

      // Check for mission
      const missionPath = join(yoyoDevPath, 'product', 'mission.md');
      if (existsSync(missionPath)) {
        try {
          const mission = readFileSync(missionPath, 'utf-8');
          // Get first 500 chars of mission
          const missionSummary = mission.slice(0, 500);
          parts.push(`Mission: ${missionSummary}${mission.length > 500 ? '...' : ''}`);
        } catch {
          // Ignore
        }
      }
    }

    // Add high-level directory structure
    const structure = this.getDirectoryStructure(this.projectRoot, 2);
    if (structure) {
      parts.push(`\nProject Structure:\n${structure}`);
    }

    return parts.join('\n');
  }

  /**
   * Get directory structure as a tree
   */
  private getDirectoryStructure(dir: string, depth: number, prefix = ''): string {
    if (depth === 0) return '';

    const lines: string[] = [];
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
        .filter((entry) => {
          // Skip hidden files, node_modules, etc.
          const name = entry.name;
          return (
            !name.startsWith('.') &&
            name !== 'node_modules' &&
            name !== 'dist' &&
            name !== 'build' &&
            name !== 'coverage' &&
            name !== '__pycache__'
          );
        })
        .slice(0, 15); // Limit entries

      for (const entry of entries) {
        const isDir = entry.isDirectory();
        lines.push(`${prefix}${isDir ? '/' : ''}${entry.name}`);

        if (isDir && depth > 1) {
          const subPath = join(dir, entry.name);
          const subTree = this.getDirectoryStructure(subPath, depth - 1, prefix + '  ');
          if (subTree) {
            lines.push(subTree);
          }
        }
      }
    } catch {
      // Ignore permission errors
    }

    return lines.join('\n');
  }

  /**
   * Extract file references from response text
   */
  private extractFileReferences(text: string): FileReference[] {
    const references: FileReference[] = [];
    const pattern = /\[FILE:([^\]:]+)(?::(\d+)(?:-(\d+))?)?\]/g;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const [, filePath, startLine, endLine] = match;

      // Validate file exists
      const fullPath = join(this.projectRoot, filePath);
      if (existsSync(fullPath)) {
        const ref: FileReference = {
          path: filePath,
        };

        if (startLine) {
          ref.lineNumber = parseInt(startLine, 10);
          if (endLine) {
            ref.endLineNumber = parseInt(endLine, 10);
          }
        }

        // Avoid duplicates
        if (!references.some((r) => r.path === ref.path && r.lineNumber === ref.lineNumber)) {
          references.push(ref);
        }
      }
    }

    return references;
  }

  /**
   * Return placeholder response when API key is missing
   */
  private getPlaceholderResponse(): ChatResponse {
    return {
      response: `**Chat feature requires ANTHROPIC_API_KEY**

To enable the codebase chat feature, please set the \`ANTHROPIC_API_KEY\` environment variable:

\`\`\`bash
export ANTHROPIC_API_KEY="your-api-key-here"
\`\`\`

You can get an API key from [Anthropic Console](https://console.anthropic.com/).

Once configured, restart the Yoyo Dev GUI server to enable chat functionality.`,
      references: [],
    };
  }
}

// =============================================================================
// Singleton Factory
// =============================================================================

let chatServiceInstance: ChatService | null = null;

/**
 * Get or create chat service instance
 */
export function getChatService(projectRoot: string): ChatService {
  if (!chatServiceInstance || chatServiceInstance['projectRoot'] !== projectRoot) {
    chatServiceInstance = new ChatService(projectRoot);
  }
  return chatServiceInstance;
}

export default ChatService;
