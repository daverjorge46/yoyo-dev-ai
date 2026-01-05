/**
 * Visual Memory Module
 *
 * Manages visual information and image-based memory.
 * Provides:
 * - Image metadata storage
 * - Visual indexing and tagging
 * - Screenshot management
 * - Cross-referencing with code
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MemoryBlockType, MemoryScope } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Visual content types.
 */
export type VisualType =
  | 'screenshot'
  | 'diagram'
  | 'mockup'
  | 'chart'
  | 'photo'
  | 'icon'
  | 'logo'
  | 'other';

/**
 * Visual memory entry.
 */
export interface VisualMemory {
  /** Unique visual ID */
  id: string;
  /** Visual type */
  type: VisualType;
  /** Title/name */
  title: string;
  /** File path or URL */
  source: string;
  /** Whether source is a URL */
  isUrl: boolean;
  /** Image format */
  format: 'png' | 'jpg' | 'gif' | 'svg' | 'webp' | 'other';
  /** Image dimensions */
  dimensions?: {
    width: number;
    height: number;
  };
  /** File size in bytes (for local files) */
  sizeBytes?: number;
  /** Description of what the visual shows */
  description?: string;
  /** Auto-generated alt text */
  altText?: string;
  /** Tags for categorization */
  tags: string[];
  /** Related entities (file paths, component names, etc.) */
  relatedEntities: string[];
  /** When the visual was added */
  createdAt: Date;
  /** When the visual was last updated */
  updatedAt: Date;
  /** Associated memory block */
  blockType?: MemoryBlockType;
  /** Associated scope */
  scope?: MemoryScope;
  /** Creator ID */
  createdBy?: string;
  /** Access count */
  accessCount: number;
  /** Annotations on the visual */
  annotations: VisualAnnotation[];
  /** OCR text if available */
  ocrText?: string;
}

/**
 * Annotation on a visual.
 */
export interface VisualAnnotation {
  /** Annotation ID */
  id: string;
  /** Annotation type */
  type: 'text' | 'arrow' | 'highlight' | 'box';
  /** Position (percentage from top-left) */
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  /** Annotation content */
  content: string;
  /** Color (hex) */
  color?: string;
}

/**
 * Visual memory input for creation.
 */
export interface VisualInput {
  /** Source file path or URL */
  source: string;
  /** Title */
  title: string;
  /** Visual type */
  type?: VisualType;
  /** Description */
  description?: string;
  /** Tags */
  tags?: string[];
  /** Related entities */
  relatedEntities?: string[];
  /** Associated block type */
  blockType?: MemoryBlockType;
  /** Associated scope */
  scope?: MemoryScope;
  /** Creator ID */
  createdBy?: string;
}

/**
 * Visual memory manager configuration.
 */
export interface VisualMemoryConfig {
  /** Maximum stored visuals (default: 500) */
  maxVisuals: number;
  /** Auto-detect visual type (default: true) */
  autoDetectType: boolean;
  /** Extract metadata from images (default: true) */
  extractMetadata: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: VisualMemoryConfig = {
  maxVisuals: 500,
  autoDetectType: true,
  extractMetadata: true,
};

/**
 * Image format detection by extension.
 */
const FORMAT_FROM_EXTENSION: Record<string, VisualMemory['format']> = {
  '.png': 'png',
  '.jpg': 'jpg',
  '.jpeg': 'jpg',
  '.gif': 'gif',
  '.svg': 'svg',
  '.webp': 'webp',
};

// =============================================================================
// VisualMemoryManager Class
// =============================================================================

/**
 * Manages visual memories.
 */
export class VisualMemoryManager {
  private config: VisualMemoryConfig;
  private visuals: Map<string, VisualMemory> = new Map();
  private visualCounter: number = 0;
  private annotationCounter: number = 0;

  constructor(config: Partial<VisualMemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a visual memory.
   */
  addVisual(input: VisualInput): VisualMemory {
    // Check limit
    if (this.visuals.size >= this.config.maxVisuals) {
      throw new Error(`Maximum visuals limit (${this.config.maxVisuals}) reached`);
    }

    const isUrl = input.source.startsWith('http://') || input.source.startsWith('https://');
    const format = this.detectFormat(input.source);
    const type = input.type ?? (this.config.autoDetectType ? this.detectType(input.source, input.title) : 'other');

    // Get metadata for local files
    let dimensions: VisualMemory['dimensions'];
    let sizeBytes: number | undefined;

    if (!isUrl && fs.existsSync(input.source) && this.config.extractMetadata) {
      const stats = fs.statSync(input.source);
      sizeBytes = stats.size;
      // Note: Actual image dimension extraction would require an image library
      // This is a placeholder for the metadata structure
    }

    const id = this.generateId();
    const now = new Date();

    const visual: VisualMemory = {
      id,
      type,
      title: input.title,
      source: input.source,
      isUrl,
      format,
      dimensions,
      sizeBytes,
      description: input.description,
      tags: input.tags ?? [],
      relatedEntities: input.relatedEntities ?? [],
      createdAt: now,
      updatedAt: now,
      blockType: input.blockType,
      scope: input.scope,
      createdBy: input.createdBy,
      accessCount: 0,
      annotations: [],
    };

    this.visuals.set(id, visual);
    return visual;
  }

  /**
   * Get a visual by ID.
   */
  getVisual(id: string): VisualMemory | undefined {
    const visual = this.visuals.get(id);
    if (visual) {
      visual.accessCount++;
    }
    return visual;
  }

  /**
   * Update a visual.
   */
  updateVisual(id: string, updates: Partial<Pick<VisualMemory, 'title' | 'description' | 'tags' | 'relatedEntities' | 'altText'>>): boolean {
    const visual = this.visuals.get(id);
    if (!visual) return false;

    if (updates.title !== undefined) visual.title = updates.title;
    if (updates.description !== undefined) visual.description = updates.description;
    if (updates.tags !== undefined) visual.tags = updates.tags;
    if (updates.relatedEntities !== undefined) visual.relatedEntities = updates.relatedEntities;
    if (updates.altText !== undefined) visual.altText = updates.altText;

    visual.updatedAt = new Date();
    return true;
  }

  /**
   * Delete a visual.
   */
  deleteVisual(id: string): boolean {
    return this.visuals.delete(id);
  }

  /**
   * Add an annotation to a visual.
   */
  addAnnotation(visualId: string, annotation: Omit<VisualAnnotation, 'id'>): VisualAnnotation | null {
    const visual = this.visuals.get(visualId);
    if (!visual) return null;

    const newAnnotation: VisualAnnotation = {
      ...annotation,
      id: `ann_${++this.annotationCounter}`,
    };

    visual.annotations.push(newAnnotation);
    visual.updatedAt = new Date();

    return newAnnotation;
  }

  /**
   * Remove an annotation.
   */
  removeAnnotation(visualId: string, annotationId: string): boolean {
    const visual = this.visuals.get(visualId);
    if (!visual) return false;

    const index = visual.annotations.findIndex((a) => a.id === annotationId);
    if (index === -1) return false;

    visual.annotations.splice(index, 1);
    visual.updatedAt = new Date();
    return true;
  }

  /**
   * Set OCR text for a visual.
   */
  setOcrText(id: string, text: string): boolean {
    const visual = this.visuals.get(id);
    if (!visual) return false;

    visual.ocrText = text;
    visual.updatedAt = new Date();
    return true;
  }

  /**
   * List all visuals.
   */
  listVisuals(filter?: {
    type?: VisualType;
    blockType?: MemoryBlockType;
    scope?: MemoryScope;
    tags?: string[];
    format?: VisualMemory['format'];
  }): VisualMemory[] {
    let results = Array.from(this.visuals.values());

    if (filter) {
      if (filter.type) {
        results = results.filter((v) => v.type === filter.type);
      }
      if (filter.blockType) {
        results = results.filter((v) => v.blockType === filter.blockType);
      }
      if (filter.scope) {
        results = results.filter((v) => v.scope === filter.scope);
      }
      if (filter.format) {
        results = results.filter((v) => v.format === filter.format);
      }
      if (filter.tags?.length) {
        results = results.filter((v) =>
          filter.tags!.some((tag) => v.tags.includes(tag))
        );
      }
    }

    return results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Search visuals.
   */
  searchVisuals(query: string): VisualMemory[] {
    const lower = query.toLowerCase();

    return Array.from(this.visuals.values())
      .filter((v) =>
        v.title.toLowerCase().includes(lower) ||
        v.description?.toLowerCase().includes(lower) ||
        v.altText?.toLowerCase().includes(lower) ||
        v.ocrText?.toLowerCase().includes(lower) ||
        v.tags.some((t) => t.toLowerCase().includes(lower)) ||
        v.relatedEntities.some((e) => e.toLowerCase().includes(lower))
      )
      .sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * Find visuals related to an entity.
   */
  findByRelatedEntity(entity: string): VisualMemory[] {
    const lower = entity.toLowerCase();

    return Array.from(this.visuals.values()).filter((v) =>
      v.relatedEntities.some((e) => e.toLowerCase().includes(lower))
    );
  }

  /**
   * Get screenshots.
   */
  getScreenshots(): VisualMemory[] {
    return this.listVisuals({ type: 'screenshot' });
  }

  /**
   * Get diagrams.
   */
  getDiagrams(): VisualMemory[] {
    return this.listVisuals({ type: 'diagram' });
  }

  /**
   * Get most accessed visuals.
   */
  getMostAccessed(limit: number = 10): VisualMemory[] {
    return Array.from(this.visuals.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Get statistics.
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    byFormat: Record<string, number>;
    totalAnnotations: number;
    withOcr: number;
  } {
    const visuals = Array.from(this.visuals.values());
    const byType: Record<string, number> = {};
    const byFormat: Record<string, number> = {};
    let totalAnnotations = 0;
    let withOcr = 0;

    for (const v of visuals) {
      byType[v.type] = (byType[v.type] ?? 0) + 1;
      byFormat[v.format] = (byFormat[v.format] ?? 0) + 1;
      totalAnnotations += v.annotations.length;
      if (v.ocrText) withOcr++;
    }

    return {
      total: visuals.length,
      byType,
      byFormat,
      totalAnnotations,
      withOcr,
    };
  }

  /**
   * Clear all visuals.
   */
  clear(): void {
    this.visuals.clear();
  }

  /**
   * Export visuals as JSON.
   */
  export(): string {
    return JSON.stringify(Array.from(this.visuals.values()), null, 2);
  }

  /**
   * Import visuals from JSON.
   */
  import(json: string): number {
    const visuals = JSON.parse(json) as VisualMemory[];
    let imported = 0;

    for (const visual of visuals) {
      visual.createdAt = new Date(visual.createdAt);
      visual.updatedAt = new Date(visual.updatedAt);
      this.visuals.set(visual.id, visual);
      imported++;
    }

    return imported;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private generateId(): string {
    return `vis_${Date.now()}_${++this.visualCounter}`;
  }

  private detectFormat(source: string): VisualMemory['format'] {
    const ext = path.extname(source).toLowerCase();
    return FORMAT_FROM_EXTENSION[ext] ?? 'other';
  }

  private detectType(source: string, title: string): VisualType {
    const lower = (source + ' ' + title).toLowerCase();

    if (lower.includes('screenshot') || lower.includes('screen')) {
      return 'screenshot';
    }
    if (lower.includes('diagram') || lower.includes('flow') || lower.includes('architecture')) {
      return 'diagram';
    }
    if (lower.includes('mockup') || lower.includes('wireframe') || lower.includes('design')) {
      return 'mockup';
    }
    if (lower.includes('chart') || lower.includes('graph') || lower.includes('plot')) {
      return 'chart';
    }
    if (lower.includes('icon')) {
      return 'icon';
    }
    if (lower.includes('logo')) {
      return 'logo';
    }

    return 'other';
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a visual memory manager instance.
 *
 * @param config - Manager configuration
 * @returns VisualMemoryManager instance
 */
export function createVisualMemoryManager(
  config?: Partial<VisualMemoryConfig>
): VisualMemoryManager {
  return new VisualMemoryManager(config);
}

// =============================================================================
// Singleton Instance
// =============================================================================

let _visualMemoryManager: VisualMemoryManager | null = null;

/**
 * Get the global visual memory manager instance.
 */
export function getVisualMemoryManager(): VisualMemoryManager {
  if (!_visualMemoryManager) {
    _visualMemoryManager = new VisualMemoryManager();
  }
  return _visualMemoryManager;
}

/**
 * Reset the global visual memory manager instance.
 */
export function resetVisualMemoryManager(): void {
  _visualMemoryManager = null;
}
