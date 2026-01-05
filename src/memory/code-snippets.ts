/**
 * Code Snippets Module
 *
 * Storage and management of code snippets with syntax highlighting metadata.
 * Provides:
 * - Code snippet storage
 * - Language detection
 * - Syntax highlighting data
 * - Code search functionality
 */

import type { MemoryBlockType, MemoryScope } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Supported programming languages.
 */
export type Language =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'rust'
  | 'go'
  | 'java'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'ruby'
  | 'php'
  | 'swift'
  | 'kotlin'
  | 'scala'
  | 'html'
  | 'css'
  | 'scss'
  | 'sql'
  | 'shell'
  | 'bash'
  | 'powershell'
  | 'yaml'
  | 'json'
  | 'xml'
  | 'markdown'
  | 'plaintext'
  | 'unknown';

/**
 * Code snippet metadata.
 */
export interface CodeSnippet {
  /** Unique snippet ID */
  id: string;
  /** Snippet title */
  title: string;
  /** The code content */
  code: string;
  /** Programming language */
  language: Language;
  /** Description of what the code does */
  description?: string;
  /** Source file path (if from a file) */
  sourceFile?: string;
  /** Line range in source file */
  lineRange?: { start: number; end: number };
  /** Tags for categorization */
  tags: string[];
  /** When the snippet was created */
  createdAt: Date;
  /** When the snippet was last modified */
  updatedAt: Date;
  /** Associated memory block */
  blockType?: MemoryBlockType;
  /** Associated scope */
  scope?: MemoryScope;
  /** Creator ID */
  createdBy?: string;
  /** Number of times accessed */
  accessCount: number;
  /** Syntax highlighting data */
  highlighting?: SyntaxHighlighting;
}

/**
 * Syntax highlighting data.
 */
export interface SyntaxHighlighting {
  /** Token positions for highlighting */
  tokens: Array<{
    type: TokenType;
    start: number;
    end: number;
    value: string;
  }>;
}

/**
 * Token types for syntax highlighting.
 */
export type TokenType =
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'function'
  | 'class'
  | 'variable'
  | 'operator'
  | 'punctuation'
  | 'type'
  | 'decorator'
  | 'other';

/**
 * Snippet input for creation.
 */
export interface SnippetInput {
  /** Snippet title */
  title: string;
  /** The code content */
  code: string;
  /** Programming language (auto-detected if not provided) */
  language?: Language;
  /** Description */
  description?: string;
  /** Source file path */
  sourceFile?: string;
  /** Line range */
  lineRange?: { start: number; end: number };
  /** Tags */
  tags?: string[];
  /** Associated block type */
  blockType?: MemoryBlockType;
  /** Associated scope */
  scope?: MemoryScope;
  /** Creator ID */
  createdBy?: string;
}

/**
 * Snippet manager configuration.
 */
export interface SnippetManagerConfig {
  /** Maximum code length (default: 50000 chars) */
  maxCodeLength: number;
  /** Auto-detect language (default: true) */
  autoDetectLanguage: boolean;
  /** Generate syntax highlighting (default: false for performance) */
  generateHighlighting: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: SnippetManagerConfig = {
  maxCodeLength: 50000,
  autoDetectLanguage: true,
  generateHighlighting: false,
};

/**
 * File extension to language mapping.
 */
const EXTENSION_TO_LANGUAGE: Record<string, Language> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'scss',
  '.sql': 'sql',
  '.sh': 'shell',
  '.bash': 'bash',
  '.ps1': 'powershell',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.json': 'json',
  '.xml': 'xml',
  '.md': 'markdown',
  '.txt': 'plaintext',
};

/**
 * Language patterns for detection.
 */
const LANGUAGE_PATTERNS: Array<{ pattern: RegExp; language: Language; weight: number }> = [
  { pattern: /^import\s+.*\s+from\s+['"]|^export\s+(default\s+)?/m, language: 'typescript', weight: 0.9 },
  { pattern: /:\s*(string|number|boolean|any)\s*[=;,)]/, language: 'typescript', weight: 0.95 },
  { pattern: /^def\s+\w+\s*\(|^class\s+\w+:|import\s+\w+$/m, language: 'python', weight: 0.9 },
  { pattern: /^fn\s+\w+|let\s+mut\s+|impl\s+\w+/m, language: 'rust', weight: 0.9 },
  { pattern: /^package\s+main|^func\s+\w+\(|:=/, language: 'go', weight: 0.9 },
  { pattern: /^public\s+class\s+|^private\s+\w+|System\.out\.println/m, language: 'java', weight: 0.9 },
  { pattern: /^#include\s+<|printf\s*\(|int\s+main\s*\(/m, language: 'c', weight: 0.8 },
  { pattern: /^using\s+namespace|std::|cout\s*<</m, language: 'cpp', weight: 0.9 },
  { pattern: /^namespace\s+\w+|public\s+class\s+\w+\s*:/m, language: 'csharp', weight: 0.9 },
  { pattern: /^\s*SELECT\s+|^\s*INSERT\s+INTO|^\s*CREATE\s+TABLE/im, language: 'sql', weight: 0.9 },
  { pattern: /^<\?php|^\$\w+\s*=/, language: 'php', weight: 0.9 },
  { pattern: /^<!DOCTYPE\s+html|<html|<\/html>/i, language: 'html', weight: 0.9 },
  { pattern: /^{\s*"[^"]+"\s*:/, language: 'json', weight: 0.95 },
  { pattern: /^[a-z_]+:\s*$/im, language: 'yaml', weight: 0.7 },
  { pattern: /^#!/, language: 'shell', weight: 0.8 },
];

// =============================================================================
// SnippetManager Class
// =============================================================================

/**
 * Manages code snippets.
 */
export class SnippetManager {
  private config: SnippetManagerConfig;
  private snippets: Map<string, CodeSnippet> = new Map();
  private snippetCounter: number = 0;

  constructor(config: Partial<SnippetManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a code snippet.
   */
  addSnippet(input: SnippetInput): CodeSnippet {
    // Validate length
    if (input.code.length > this.config.maxCodeLength) {
      throw new Error(`Code length ${input.code.length} exceeds maximum ${this.config.maxCodeLength}`);
    }

    // Detect language if needed
    let language = input.language;
    if (!language && this.config.autoDetectLanguage) {
      language = this.detectLanguage(input.code, input.sourceFile);
    }
    language = language ?? 'unknown';

    // Generate ID
    const id = this.generateId();
    const now = new Date();

    // Create snippet
    const snippet: CodeSnippet = {
      id,
      title: input.title,
      code: input.code,
      language,
      description: input.description,
      sourceFile: input.sourceFile,
      lineRange: input.lineRange,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
      blockType: input.blockType,
      scope: input.scope,
      createdBy: input.createdBy,
      accessCount: 0,
    };

    // Generate syntax highlighting if enabled
    if (this.config.generateHighlighting) {
      snippet.highlighting = this.generateHighlighting(input.code, language);
    }

    this.snippets.set(id, snippet);
    return snippet;
  }

  /**
   * Get a snippet by ID.
   */
  getSnippet(id: string): CodeSnippet | undefined {
    const snippet = this.snippets.get(id);
    if (snippet) {
      snippet.accessCount++;
    }
    return snippet;
  }

  /**
   * Update a snippet.
   */
  updateSnippet(id: string, updates: Partial<SnippetInput>): boolean {
    const snippet = this.snippets.get(id);
    if (!snippet) return false;

    if (updates.title !== undefined) {
      snippet.title = updates.title;
    }
    if (updates.code !== undefined) {
      if (updates.code.length > this.config.maxCodeLength) {
        throw new Error(`Code length exceeds maximum`);
      }
      snippet.code = updates.code;
      if (this.config.generateHighlighting) {
        snippet.highlighting = this.generateHighlighting(updates.code, snippet.language);
      }
    }
    if (updates.language !== undefined) {
      snippet.language = updates.language;
    }
    if (updates.description !== undefined) {
      snippet.description = updates.description;
    }
    if (updates.tags !== undefined) {
      snippet.tags = updates.tags;
    }

    snippet.updatedAt = new Date();
    return true;
  }

  /**
   * Delete a snippet.
   */
  deleteSnippet(id: string): boolean {
    return this.snippets.delete(id);
  }

  /**
   * List all snippets.
   */
  listSnippets(filter?: {
    language?: Language;
    blockType?: MemoryBlockType;
    scope?: MemoryScope;
    tags?: string[];
  }): CodeSnippet[] {
    let results = Array.from(this.snippets.values());

    if (filter) {
      if (filter.language) {
        results = results.filter((s) => s.language === filter.language);
      }
      if (filter.blockType) {
        results = results.filter((s) => s.blockType === filter.blockType);
      }
      if (filter.scope) {
        results = results.filter((s) => s.scope === filter.scope);
      }
      if (filter.tags?.length) {
        results = results.filter((s) =>
          filter.tags!.some((tag) => s.tags.includes(tag))
        );
      }
    }

    return results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Search snippets.
   */
  searchSnippets(query: string): CodeSnippet[] {
    const lower = query.toLowerCase();

    return Array.from(this.snippets.values())
      .filter((s) =>
        s.title.toLowerCase().includes(lower) ||
        s.code.toLowerCase().includes(lower) ||
        s.description?.toLowerCase().includes(lower) ||
        s.tags.some((t) => t.toLowerCase().includes(lower))
      )
      .sort((a, b) => {
        // Prioritize title matches
        const aTitle = a.title.toLowerCase().includes(lower) ? 1 : 0;
        const bTitle = b.title.toLowerCase().includes(lower) ? 1 : 0;
        return bTitle - aTitle || b.accessCount - a.accessCount;
      });
  }

  /**
   * Get snippets by language.
   */
  getByLanguage(language: Language): CodeSnippet[] {
    return this.listSnippets({ language });
  }

  /**
   * Get most accessed snippets.
   */
  getMostAccessed(limit: number = 10): CodeSnippet[] {
    return Array.from(this.snippets.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Detect language from code content.
   */
  detectLanguage(code: string, sourceFile?: string): Language {
    // Try file extension first
    if (sourceFile) {
      const ext = sourceFile.substring(sourceFile.lastIndexOf('.'));
      const langFromExt = EXTENSION_TO_LANGUAGE[ext.toLowerCase()];
      if (langFromExt) return langFromExt;
    }

    // Pattern matching
    let bestMatch: { language: Language; weight: number } | null = null;

    for (const { pattern, language, weight } of LANGUAGE_PATTERNS) {
      if (pattern.test(code)) {
        if (!bestMatch || weight > bestMatch.weight) {
          bestMatch = { language, weight };
        }
      }
    }

    return bestMatch?.language ?? 'unknown';
  }

  /**
   * Get statistics.
   */
  getStats(): {
    total: number;
    byLanguage: Record<string, number>;
    totalCodeLength: number;
    avgCodeLength: number;
  } {
    const snippets = Array.from(this.snippets.values());
    const byLanguage: Record<string, number> = {};
    let totalLength = 0;

    for (const s of snippets) {
      byLanguage[s.language] = (byLanguage[s.language] ?? 0) + 1;
      totalLength += s.code.length;
    }

    return {
      total: snippets.length,
      byLanguage,
      totalCodeLength: totalLength,
      avgCodeLength: snippets.length > 0 ? totalLength / snippets.length : 0,
    };
  }

  /**
   * Clear all snippets.
   */
  clear(): void {
    this.snippets.clear();
  }

  /**
   * Export snippets as JSON.
   */
  export(): string {
    return JSON.stringify(Array.from(this.snippets.values()), null, 2);
  }

  /**
   * Import snippets from JSON.
   */
  import(json: string): number {
    const snippets = JSON.parse(json) as CodeSnippet[];
    let imported = 0;

    for (const snippet of snippets) {
      snippet.createdAt = new Date(snippet.createdAt);
      snippet.updatedAt = new Date(snippet.updatedAt);
      this.snippets.set(snippet.id, snippet);
      imported++;
    }

    return imported;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private generateId(): string {
    return `snip_${Date.now()}_${++this.snippetCounter}`;
  }

  private generateHighlighting(code: string, _language: Language): SyntaxHighlighting {
    // Simple token-based highlighting (basic patterns)
    // Note: _language parameter reserved for future language-specific highlighting
    const tokens: SyntaxHighlighting['tokens'] = [];

    // This is a simplified implementation
    // In production, you'd use a proper lexer like tree-sitter

    const patterns: Array<{ type: TokenType; regex: RegExp }> = [
      { type: 'comment', regex: /\/\/.*|\/\*[\s\S]*?\*\/|#.*/g },
      { type: 'string', regex: /'[^']*'|"[^"]*"|`[^`]*`/g },
      { type: 'number', regex: /\b\d+\.?\d*\b/g },
      { type: 'keyword', regex: /\b(const|let|var|function|class|if|else|return|import|export|from|async|await)\b/g },
    ];

    for (const { type, regex } of patterns) {
      let match;
      while ((match = regex.exec(code)) !== null) {
        tokens.push({
          type,
          start: match.index,
          end: match.index + match[0].length,
          value: match[0],
        });
      }
    }

    // Sort by position
    tokens.sort((a, b) => a.start - b.start);

    return { tokens };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a snippet manager instance.
 *
 * @param config - Manager configuration
 * @returns SnippetManager instance
 */
export function createSnippetManager(
  config?: Partial<SnippetManagerConfig>
): SnippetManager {
  return new SnippetManager(config);
}

// =============================================================================
// Singleton Instance
// =============================================================================

let _snippetManager: SnippetManager | null = null;

/**
 * Get the global snippet manager instance.
 */
export function getSnippetManager(): SnippetManager {
  if (!_snippetManager) {
    _snippetManager = new SnippetManager();
  }
  return _snippetManager;
}

/**
 * Reset the global snippet manager instance.
 */
export function resetSnippetManager(): void {
  _snippetManager = null;
}
