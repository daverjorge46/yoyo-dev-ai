/**
 * Backup Manager Module
 *
 * Handles memory database backup and restore operations.
 * Provides:
 * - Full database backups
 * - Incremental backups
 * - Point-in-time restore
 * - Backup verification
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MemoryStore } from './store.js';

// MemoryBlockType and MemoryScope are used in BlockCount tracking (future enhancement)

// =============================================================================
// Types
// =============================================================================

/**
 * Backup metadata.
 */
export interface BackupMetadata {
  /** Unique backup ID */
  id: string;
  /** Backup type */
  type: 'full' | 'incremental';
  /** When the backup was created */
  createdAt: Date;
  /** Source database path */
  sourcePath: string;
  /** Backup file path */
  backupPath: string;
  /** Backup file size in bytes */
  sizeBytes: number;
  /** Number of blocks backed up */
  blockCount: number;
  /** Schema version at backup time */
  schemaVersion: number;
  /** Checksum for verification */
  checksum: string;
  /** Description or notes */
  description?: string;
  /** Parent backup ID (for incremental) */
  parentBackupId?: string;
}

/**
 * Backup options.
 */
export interface BackupOptions {
  /** Backup type (default: 'full') */
  type?: 'full' | 'incremental';
  /** Description for this backup */
  description?: string;
  /** Compress the backup (default: false) */
  compress?: boolean;
  /** Verify backup after creation (default: true) */
  verify?: boolean;
}

/**
 * Restore options.
 */
export interface RestoreOptions {
  /** Backup ID to restore from */
  backupId: string;
  /** Target database path (default: overwrites source) */
  targetPath?: string;
  /** Verify backup before restore (default: true) */
  verify?: boolean;
  /** Create backup of current state before restore (default: true) */
  createBackupFirst?: boolean;
}

/**
 * Backup result.
 */
export interface BackupResult {
  /** Whether backup succeeded */
  success: boolean;
  /** Backup metadata (if successful) */
  metadata?: BackupMetadata;
  /** Error message (if failed) */
  error?: string;
  /** Time taken in ms */
  durationMs: number;
}

/**
 * Restore result.
 */
export interface RestoreResult {
  /** Whether restore succeeded */
  success: boolean;
  /** Restored backup metadata */
  metadata?: BackupMetadata;
  /** Pre-restore backup ID (if createBackupFirst was true) */
  preRestoreBackupId?: string;
  /** Error message (if failed) */
  error?: string;
  /** Time taken in ms */
  durationMs: number;
}

/**
 * Verification result.
 */
export interface VerificationResult {
  /** Whether verification passed */
  valid: boolean;
  /** Issues found (if any) */
  issues: string[];
  /** Expected checksum */
  expectedChecksum: string;
  /** Actual checksum */
  actualChecksum: string;
}

/**
 * Backup manager configuration.
 */
export interface BackupManagerConfig {
  /** Directory to store backups */
  backupDir: string;
  /** Maximum number of backups to keep (default: 10) */
  maxBackups: number;
  /** Auto-cleanup old backups (default: true) */
  autoCleanup: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: BackupManagerConfig = {
  backupDir: '.yoyo-ai/backups',
  maxBackups: 10,
  autoCleanup: true,
};

// =============================================================================
// BackupManager Class
// =============================================================================

/**
 * Manages memory database backups and restoration.
 */
export class BackupManager {
  private config: BackupManagerConfig;
  private backups: Map<string, BackupMetadata> = new Map();
  private _store: MemoryStore | null = null;

  constructor(config: Partial<BackupManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureBackupDirectory();
    this.loadBackupIndex();
  }

  /**
   * Set the memory store to backup.
   */
  setStore(store: MemoryStore): void {
    this._store = store;
  }

  /**
   * Get the memory store.
   */
  getStore(): MemoryStore | null {
    return this._store;
  }

  /**
   * Create a backup.
   */
  async createBackup(sourcePath: string, options: BackupOptions = {}): Promise<BackupResult> {
    const startTime = Date.now();

    try {
      // Validate source exists
      if (!fs.existsSync(sourcePath)) {
        return {
          success: false,
          error: `Source file not found: ${sourcePath}`,
          durationMs: Date.now() - startTime,
        };
      }

      // Generate backup ID and path
      const backupId = this.generateBackupId();
      const backupFileName = `${backupId}.db`;
      const backupPath = path.join(this.config.backupDir, backupFileName);

      // Copy database file
      fs.copyFileSync(sourcePath, backupPath);

      // Get file stats
      const stats = fs.statSync(backupPath);
      const checksum = await this.calculateChecksum(backupPath);

      // Create metadata
      const metadata: BackupMetadata = {
        id: backupId,
        type: options.type ?? 'full',
        createdAt: new Date(),
        sourcePath,
        backupPath,
        sizeBytes: stats.size,
        blockCount: 0, // Would query from store if available
        schemaVersion: 2, // Current schema version
        checksum,
        description: options.description,
      };

      // Verify backup if requested
      if (options.verify ?? true) {
        const verification = await this.verifyBackup(backupId, metadata);
        if (!verification.valid) {
          // Cleanup failed backup
          fs.unlinkSync(backupPath);
          return {
            success: false,
            error: `Backup verification failed: ${verification.issues.join(', ')}`,
            durationMs: Date.now() - startTime,
          };
        }
      }

      // Save metadata
      this.backups.set(backupId, metadata);
      this.saveBackupIndex();

      // Auto-cleanup if enabled
      if (this.config.autoCleanup) {
        this.cleanupOldBackups();
      }

      return {
        success: true,
        metadata,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Restore from a backup.
   */
  async restore(options: RestoreOptions): Promise<RestoreResult> {
    const startTime = Date.now();

    try {
      const metadata = this.backups.get(options.backupId);
      if (!metadata) {
        return {
          success: false,
          error: `Backup not found: ${options.backupId}`,
          durationMs: Date.now() - startTime,
        };
      }

      // Verify backup before restore if requested
      if (options.verify ?? true) {
        const verification = await this.verifyBackup(options.backupId);
        if (!verification.valid) {
          return {
            success: false,
            error: `Backup verification failed: ${verification.issues.join(', ')}`,
            durationMs: Date.now() - startTime,
          };
        }
      }

      const targetPath = options.targetPath ?? metadata.sourcePath;
      let preRestoreBackupId: string | undefined;

      // Create backup of current state if requested
      if ((options.createBackupFirst ?? true) && fs.existsSync(targetPath)) {
        const preBackup = await this.createBackup(targetPath, {
          description: `Pre-restore backup before restoring ${options.backupId}`,
        });
        if (preBackup.success) {
          preRestoreBackupId = preBackup.metadata?.id;
        }
      }

      // Restore the backup
      fs.copyFileSync(metadata.backupPath, targetPath);

      return {
        success: true,
        metadata,
        preRestoreBackupId,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Verify a backup's integrity.
   */
  async verifyBackup(backupId: string, metadata?: BackupMetadata): Promise<VerificationResult> {
    const backup = metadata ?? this.backups.get(backupId);

    if (!backup) {
      return {
        valid: false,
        issues: ['Backup not found'],
        expectedChecksum: '',
        actualChecksum: '',
      };
    }

    const issues: string[] = [];

    // Check file exists
    if (!fs.existsSync(backup.backupPath)) {
      issues.push('Backup file not found');
      return {
        valid: false,
        issues,
        expectedChecksum: backup.checksum,
        actualChecksum: '',
      };
    }

    // Verify checksum
    const actualChecksum = await this.calculateChecksum(backup.backupPath);
    if (actualChecksum !== backup.checksum) {
      issues.push('Checksum mismatch');
    }

    // Verify file size
    const stats = fs.statSync(backup.backupPath);
    if (stats.size !== backup.sizeBytes) {
      issues.push('File size mismatch');
    }

    return {
      valid: issues.length === 0,
      issues,
      expectedChecksum: backup.checksum,
      actualChecksum,
    };
  }

  /**
   * Delete a backup.
   */
  deleteBackup(backupId: string): boolean {
    const metadata = this.backups.get(backupId);
    if (!metadata) return false;

    try {
      if (fs.existsSync(metadata.backupPath)) {
        fs.unlinkSync(metadata.backupPath);
      }
      this.backups.delete(backupId);
      this.saveBackupIndex();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all backups.
   */
  listBackups(): BackupMetadata[] {
    return Array.from(this.backups.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get a specific backup's metadata.
   */
  getBackup(backupId: string): BackupMetadata | undefined {
    return this.backups.get(backupId);
  }

  /**
   * Get backup statistics.
   */
  getStats(): {
    totalBackups: number;
    totalSizeBytes: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
  } {
    const backups = this.listBackups();

    return {
      totalBackups: backups.length,
      totalSizeBytes: backups.reduce((sum, b) => sum + b.sizeBytes, 0),
      oldestBackup: backups.length > 0 ? backups[backups.length - 1]!.createdAt : null,
      newestBackup: backups.length > 0 ? backups[0]!.createdAt : null,
    };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }
  }

  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `backup_${timestamp}_${random}`;
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    // Simple checksum based on file content hash
    // In production, you'd use crypto.createHash('sha256')
    const content = fs.readFileSync(filePath);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content[i]!;
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private getIndexPath(): string {
    return path.join(this.config.backupDir, 'backup-index.json');
  }

  private loadBackupIndex(): void {
    const indexPath = this.getIndexPath();
    if (!fs.existsSync(indexPath)) return;

    try {
      const data = fs.readFileSync(indexPath, 'utf-8');
      const backups = JSON.parse(data) as BackupMetadata[];

      for (const backup of backups) {
        // Convert date strings back to Date objects
        backup.createdAt = new Date(backup.createdAt);
        this.backups.set(backup.id, backup);
      }
    } catch {
      // Index corrupted, start fresh
      this.backups.clear();
    }
  }

  private saveBackupIndex(): void {
    const indexPath = this.getIndexPath();
    const backups = Array.from(this.backups.values());
    fs.writeFileSync(indexPath, JSON.stringify(backups, null, 2));
  }

  private cleanupOldBackups(): void {
    const backups = this.listBackups();

    if (backups.length <= this.config.maxBackups) return;

    // Delete oldest backups
    const toDelete = backups.slice(this.config.maxBackups);
    for (const backup of toDelete) {
      this.deleteBackup(backup.id);
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a backup manager instance.
 *
 * @param config - Manager configuration
 * @returns BackupManager instance
 */
export function createBackupManager(config?: Partial<BackupManagerConfig>): BackupManager {
  return new BackupManager(config);
}

// =============================================================================
// Singleton Instance
// =============================================================================

let _backupManager: BackupManager | null = null;

/**
 * Get the global backup manager instance.
 */
export function getBackupManager(): BackupManager {
  if (!_backupManager) {
    _backupManager = new BackupManager();
  }
  return _backupManager;
}

/**
 * Reset the global backup manager instance.
 */
export function resetBackupManager(): void {
  _backupManager = null;
}
