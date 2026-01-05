/**
 * Attachments Module
 *
 * Support for file attachments in memory blocks.
 * Provides:
 * - File attachment storage
 * - Attachment metadata management
 * - Size limits and validation
 * - Attachment retrieval
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MemoryBlockType, MemoryScope } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Supported attachment types.
 */
export type AttachmentType =
  | 'file'
  | 'code'
  | 'image'
  | 'document'
  | 'archive'
  | 'other';

/**
 * Attachment metadata.
 */
export interface AttachmentMetadata {
  /** Unique attachment ID */
  id: string;
  /** Attachment type */
  type: AttachmentType;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  sizeBytes: number;
  /** When the attachment was created */
  createdAt: Date;
  /** Who created the attachment */
  createdBy?: string;
  /** Description or caption */
  description?: string;
  /** Tags for categorization */
  tags: string[];
  /** Associated memory block */
  blockType?: MemoryBlockType;
  /** Associated scope */
  scope?: MemoryScope;
  /** Checksum for integrity */
  checksum: string;
  /** Storage path */
  storagePath: string;
}

/**
 * Attachment input for creation.
 */
export interface AttachmentInput {
  /** Source file path or data */
  source: string | Buffer;
  /** Original filename */
  filename: string;
  /** MIME type (auto-detected if not provided) */
  mimeType?: string;
  /** Description */
  description?: string;
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
 * Attachment manager configuration.
 */
export interface AttachmentManagerConfig {
  /** Storage directory */
  storageDir: string;
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSizeBytes: number;
  /** Maximum total storage in bytes (default: 100MB) */
  maxTotalStorageBytes: number;
  /** Allowed MIME types (empty = all allowed) */
  allowedMimeTypes: string[];
}

/**
 * Storage statistics.
 */
export interface StorageStats {
  /** Total attachments */
  totalAttachments: number;
  /** Total storage used in bytes */
  totalSizeBytes: number;
  /** Average attachment size */
  avgSizeBytes: number;
  /** Attachments by type */
  byType: Record<AttachmentType, number>;
  /** Storage remaining in bytes */
  remainingBytes: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: AttachmentManagerConfig = {
  storageDir: '.yoyo-ai/attachments',
  maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
  maxTotalStorageBytes: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: [],
};

/**
 * MIME type to attachment type mapping.
 */
const MIME_TYPE_MAP: Record<string, AttachmentType> = {
  'text/plain': 'code',
  'text/javascript': 'code',
  'text/typescript': 'code',
  'application/javascript': 'code',
  'application/json': 'code',
  'text/html': 'code',
  'text/css': 'code',
  'text/markdown': 'document',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/svg+xml': 'image',
  'image/webp': 'image',
  'application/pdf': 'document',
  'application/zip': 'archive',
  'application/x-tar': 'archive',
  'application/gzip': 'archive',
};

// =============================================================================
// AttachmentManager Class
// =============================================================================

/**
 * Manages file attachments for memory blocks.
 */
export class AttachmentManager {
  private config: AttachmentManagerConfig;
  private attachments: Map<string, AttachmentMetadata> = new Map();
  private attachmentCounter: number = 0;

  constructor(config: Partial<AttachmentManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureStorageDirectory();
    this.loadIndex();
  }

  /**
   * Add an attachment.
   */
  async addAttachment(input: AttachmentInput): Promise<AttachmentMetadata> {
    // Get data as buffer
    let data: Buffer;
    if (typeof input.source === 'string') {
      if (fs.existsSync(input.source)) {
        data = fs.readFileSync(input.source);
      } else {
        data = Buffer.from(input.source, 'utf-8');
      }
    } else {
      data = input.source;
    }

    // Validate size
    if (data.length > this.config.maxFileSizeBytes) {
      throw new Error(`File size ${data.length} exceeds maximum ${this.config.maxFileSizeBytes}`);
    }

    // Check total storage
    const currentUsage = this.getTotalStorageUsed();
    if (currentUsage + data.length > this.config.maxTotalStorageBytes) {
      throw new Error('Storage limit exceeded');
    }

    // Determine MIME type
    const mimeType = input.mimeType ?? this.detectMimeType(input.filename);

    // Validate MIME type
    if (this.config.allowedMimeTypes.length > 0 &&
        !this.config.allowedMimeTypes.includes(mimeType)) {
      throw new Error(`MIME type ${mimeType} not allowed`);
    }

    // Generate ID and storage path
    const id = this.generateId();
    const ext = path.extname(input.filename);
    const storagePath = path.join(this.config.storageDir, `${id}${ext}`);

    // Calculate checksum
    const checksum = this.calculateChecksum(data);

    // Save file
    fs.writeFileSync(storagePath, data);

    // Create metadata
    const metadata: AttachmentMetadata = {
      id,
      type: this.getAttachmentType(mimeType),
      filename: input.filename,
      mimeType,
      sizeBytes: data.length,
      createdAt: new Date(),
      createdBy: input.createdBy,
      description: input.description,
      tags: input.tags ?? [],
      blockType: input.blockType,
      scope: input.scope,
      checksum,
      storagePath,
    };

    this.attachments.set(id, metadata);
    this.saveIndex();

    return metadata;
  }

  /**
   * Get an attachment's metadata.
   */
  getAttachment(id: string): AttachmentMetadata | undefined {
    return this.attachments.get(id);
  }

  /**
   * Get an attachment's data.
   */
  getAttachmentData(id: string): Buffer | null {
    const metadata = this.attachments.get(id);
    if (!metadata) return null;

    if (!fs.existsSync(metadata.storagePath)) {
      return null;
    }

    return fs.readFileSync(metadata.storagePath);
  }

  /**
   * Delete an attachment.
   */
  deleteAttachment(id: string): boolean {
    const metadata = this.attachments.get(id);
    if (!metadata) return false;

    try {
      if (fs.existsSync(metadata.storagePath)) {
        fs.unlinkSync(metadata.storagePath);
      }
      this.attachments.delete(id);
      this.saveIndex();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update attachment metadata.
   */
  updateAttachment(id: string, updates: Partial<Pick<AttachmentMetadata, 'description' | 'tags'>>): boolean {
    const metadata = this.attachments.get(id);
    if (!metadata) return false;

    if (updates.description !== undefined) {
      metadata.description = updates.description;
    }
    if (updates.tags !== undefined) {
      metadata.tags = updates.tags;
    }

    this.saveIndex();
    return true;
  }

  /**
   * List all attachments.
   */
  listAttachments(filter?: {
    type?: AttachmentType;
    blockType?: MemoryBlockType;
    scope?: MemoryScope;
    tags?: string[];
  }): AttachmentMetadata[] {
    let results = Array.from(this.attachments.values());

    if (filter) {
      if (filter.type) {
        results = results.filter((a) => a.type === filter.type);
      }
      if (filter.blockType) {
        results = results.filter((a) => a.blockType === filter.blockType);
      }
      if (filter.scope) {
        results = results.filter((a) => a.scope === filter.scope);
      }
      if (filter.tags?.length) {
        results = results.filter((a) =>
          filter.tags!.some((tag) => a.tags.includes(tag))
        );
      }
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Search attachments.
   */
  searchAttachments(query: string): AttachmentMetadata[] {
    const lower = query.toLowerCase();

    return Array.from(this.attachments.values()).filter((a) =>
      a.filename.toLowerCase().includes(lower) ||
      a.description?.toLowerCase().includes(lower) ||
      a.tags.some((t) => t.toLowerCase().includes(lower))
    );
  }

  /**
   * Get storage statistics.
   */
  getStats(): StorageStats {
    const attachments = Array.from(this.attachments.values());
    const totalSize = this.getTotalStorageUsed();

    const byType: Record<AttachmentType, number> = {
      file: 0,
      code: 0,
      image: 0,
      document: 0,
      archive: 0,
      other: 0,
    };

    for (const a of attachments) {
      byType[a.type]++;
    }

    return {
      totalAttachments: attachments.length,
      totalSizeBytes: totalSize,
      avgSizeBytes: attachments.length > 0 ? totalSize / attachments.length : 0,
      byType,
      remainingBytes: this.config.maxTotalStorageBytes - totalSize,
    };
  }

  /**
   * Verify attachment integrity.
   */
  verifyIntegrity(id: string): { valid: boolean; issue?: string } {
    const metadata = this.attachments.get(id);
    if (!metadata) {
      return { valid: false, issue: 'Attachment not found' };
    }

    if (!fs.existsSync(metadata.storagePath)) {
      return { valid: false, issue: 'File not found' };
    }

    const data = fs.readFileSync(metadata.storagePath);
    const currentChecksum = this.calculateChecksum(data);

    if (currentChecksum !== metadata.checksum) {
      return { valid: false, issue: 'Checksum mismatch' };
    }

    if (data.length !== metadata.sizeBytes) {
      return { valid: false, issue: 'Size mismatch' };
    }

    return { valid: true };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.config.storageDir)) {
      fs.mkdirSync(this.config.storageDir, { recursive: true });
    }
  }

  private generateId(): string {
    return `att_${Date.now()}_${++this.attachmentCounter}`;
  }

  private detectMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.md': 'text/markdown',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
    };
    return mimeTypes[ext] ?? 'application/octet-stream';
  }

  private getAttachmentType(mimeType: string): AttachmentType {
    return MIME_TYPE_MAP[mimeType] ?? 'other';
  }

  private calculateChecksum(data: Buffer): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i]!;
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private getTotalStorageUsed(): number {
    return Array.from(this.attachments.values())
      .reduce((sum, a) => sum + a.sizeBytes, 0);
  }

  private getIndexPath(): string {
    return path.join(this.config.storageDir, 'attachments-index.json');
  }

  private loadIndex(): void {
    const indexPath = this.getIndexPath();
    if (!fs.existsSync(indexPath)) return;

    try {
      const data = fs.readFileSync(indexPath, 'utf-8');
      const attachments = JSON.parse(data) as AttachmentMetadata[];

      for (const attachment of attachments) {
        attachment.createdAt = new Date(attachment.createdAt);
        this.attachments.set(attachment.id, attachment);
      }
    } catch {
      this.attachments.clear();
    }
  }

  private saveIndex(): void {
    const indexPath = this.getIndexPath();
    const attachments = Array.from(this.attachments.values());
    fs.writeFileSync(indexPath, JSON.stringify(attachments, null, 2));
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an attachment manager instance.
 *
 * @param config - Manager configuration
 * @returns AttachmentManager instance
 */
export function createAttachmentManager(
  config?: Partial<AttachmentManagerConfig>
): AttachmentManager {
  return new AttachmentManager(config);
}

// =============================================================================
// Singleton Instance
// =============================================================================

let _attachmentManager: AttachmentManager | null = null;

/**
 * Get the global attachment manager instance.
 */
export function getAttachmentManager(): AttachmentManager {
  if (!_attachmentManager) {
    _attachmentManager = new AttachmentManager();
  }
  return _attachmentManager;
}

/**
 * Reset the global attachment manager instance.
 */
export function resetAttachmentManager(): void {
  _attachmentManager = null;
}
