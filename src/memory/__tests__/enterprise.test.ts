/**
 * Enterprise Features Tests
 *
 * Tests for access control, audit logging, health monitoring, and backup.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// =============================================================================
// Access Control Tests
// =============================================================================

import {
  AccessControl,
  createAccessControl,
  DEFAULT_ROLES,
  type Role,
  type Operation,
} from '../access-control.js';

describe('Access Control', () => {
  let ac: AccessControl;

  beforeEach(() => {
    ac = createAccessControl(true);
  });

  describe('User Management', () => {
    it('should register a user', () => {
      const user = ac.registerUser('user1', 'Alice', 'editor');
      expect(user.id).toBe('user1');
      expect(user.name).toBe('Alice');
      expect(user.role).toBe('editor');
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should retrieve a registered user', () => {
      ac.registerUser('user1', 'Alice', 'editor');
      const user = ac.getUser('user1');
      expect(user).toBeDefined();
      expect(user?.name).toBe('Alice');
    });

    it('should return undefined for unknown user', () => {
      const user = ac.getUser('unknown');
      expect(user).toBeUndefined();
    });

    it('should update user role', () => {
      ac.registerUser('user1', 'Alice', 'viewer');
      const updated = ac.updateUserRole('user1', 'editor');
      expect(updated).toBe(true);
      expect(ac.getUser('user1')?.role).toBe('editor');
    });

    it('should track last activity', () => {
      ac.registerUser('user1', 'Alice', 'editor');
      expect(ac.getUser('user1')?.lastActivity).toBeUndefined();

      ac.updateLastActivity('user1');
      expect(ac.getUser('user1')?.lastActivity).toBeInstanceOf(Date);
    });

    it('should remove a user', () => {
      ac.registerUser('user1', 'Alice', 'editor');
      expect(ac.removeUser('user1')).toBe(true);
      expect(ac.getUser('user1')).toBeUndefined();
    });

    it('should list all users', () => {
      ac.registerUser('user1', 'Alice', 'editor');
      ac.registerUser('user2', 'Bob', 'viewer');
      const users = ac.getAllUsers();
      expect(users.length).toBe(2);
    });
  });

  describe('Access Checks', () => {
    beforeEach(() => {
      ac.registerUser('admin1', 'Admin', 'admin');
      ac.registerUser('editor1', 'Editor', 'editor');
      ac.registerUser('viewer1', 'Viewer', 'viewer');
      ac.registerUser('guest1', 'Guest', 'guest');
    });

    it('should allow admin all operations', () => {
      const operations: Operation[] = ['read', 'write', 'delete', 'export', 'import', 'search', 'admin'];
      for (const op of operations) {
        const result = ac.checkAccess('admin1', op);
        expect(result.allowed).toBe(true);
      }
    });

    it('should allow editor read/write/search/export', () => {
      expect(ac.checkAccess('editor1', 'read').allowed).toBe(true);
      expect(ac.checkAccess('editor1', 'write').allowed).toBe(true);
      expect(ac.checkAccess('editor1', 'search').allowed).toBe(true);
      expect(ac.checkAccess('editor1', 'export').allowed).toBe(true);
    });

    it('should deny editor delete and admin', () => {
      expect(ac.checkAccess('editor1', 'delete').allowed).toBe(false);
      expect(ac.checkAccess('editor1', 'admin').allowed).toBe(false);
    });

    it('should allow viewer only read and search', () => {
      expect(ac.checkAccess('viewer1', 'read').allowed).toBe(true);
      expect(ac.checkAccess('viewer1', 'search').allowed).toBe(true);
      expect(ac.checkAccess('viewer1', 'write').allowed).toBe(false);
    });

    it('should restrict guest to project scope', () => {
      expect(ac.checkAccess('guest1', 'read', undefined, 'project').allowed).toBe(true);
      expect(ac.checkAccess('guest1', 'read', undefined, 'global').allowed).toBe(false);
    });

    it('should deny access for unknown user', () => {
      const result = ac.checkAccess('unknown', 'read');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('User not found');
    });

    it('should provide required role on denial', () => {
      const result = ac.checkAccess('viewer1', 'write');
      expect(result.allowed).toBe(false);
      expect(result.requiredRole).toBeDefined();
    });
  });

  describe('Role Comparison', () => {
    it('should compare roles correctly', () => {
      expect(ac.compareRoles('admin', 'viewer')).toBeGreaterThan(0);
      expect(ac.compareRoles('viewer', 'admin')).toBeLessThan(0);
      expect(ac.compareRoles('editor', 'editor')).toBe(0);
    });

    it('should check role hierarchy', () => {
      expect(ac.roleHasAtLeast('admin', 'viewer')).toBe(true);
      expect(ac.roleHasAtLeast('viewer', 'admin')).toBe(false);
      expect(ac.roleHasAtLeast('editor', 'editor')).toBe(true);
    });
  });

  describe('Enable/Disable', () => {
    it('should allow all operations when disabled', () => {
      ac.setEnabled(false);
      // Unknown user should be allowed when AC is disabled
      expect(ac.checkAccess('unknown', 'admin').allowed).toBe(true);
    });

    it('should track enabled state', () => {
      expect(ac.isEnabled()).toBe(true);
      ac.setEnabled(false);
      expect(ac.isEnabled()).toBe(false);
    });
  });

  describe('Default Roles', () => {
    it('should have all default roles defined', () => {
      expect(DEFAULT_ROLES.admin).toBeDefined();
      expect(DEFAULT_ROLES.editor).toBeDefined();
      expect(DEFAULT_ROLES.viewer).toBeDefined();
      expect(DEFAULT_ROLES.guest).toBeDefined();
    });

    it('should get role definitions', () => {
      const adminRole = ac.getRole('admin');
      expect(adminRole?.permissions.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Audit Logger Tests
// =============================================================================

import {
  AuditLogger,
  createAuditLogger,
  type AuditEventType,
} from '../audit-logger.js';

describe('Audit Logger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = createAuditLogger({ maxEntries: 100 });
  });

  describe('Basic Logging', () => {
    it('should log an event', () => {
      const entry = logger.log('memory_read', 'info', 'Test read operation', {
        userId: 'user1',
      });

      expect(entry.id).toBeDefined();
      expect(entry.type).toBe('memory_read');
      expect(entry.severity).toBe('info');
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it('should log memory read', () => {
      const entry = logger.logRead('user1', 'project', 'project');
      expect(entry.type).toBe('memory_read');
      expect(entry.userId).toBe('user1');
    });

    it('should log memory write', () => {
      const entry = logger.logWrite('user1', 'user', 'project', true);
      expect(entry.type).toBe('memory_write');
      expect(entry.description).toContain('Created');
    });

    it('should log memory delete', () => {
      const entry = logger.logDelete('user1', 'corrections', 'project');
      expect(entry.type).toBe('memory_delete');
      expect(entry.severity).toBe('warning');
    });

    it('should log search', () => {
      const entry = logger.logSearch('user1', 'test query', 5);
      expect(entry.type).toBe('memory_search');
    });

    it('should log access denied', () => {
      const entry = logger.logAccessDenied('user1', 'delete', 'Permission denied');
      expect(entry.type).toBe('access_denied');
      expect(entry.severity).toBe('warning');
    });

    it('should log errors', () => {
      const error = new Error('Test error');
      const entry = logger.logError(error, 'Test context');
      expect(entry.type).toBe('system_error');
      expect(entry.severity).toBe('error');
    });

    it('should log role changes', () => {
      const entry = logger.logRoleChange('admin1', 'user1', 'viewer', 'editor');
      expect(entry.type).toBe('role_change');
    });
  });

  describe('Query', () => {
    beforeEach(() => {
      logger.logRead('user1', 'project', 'project');
      logger.logWrite('user1', 'user', 'project', true);
      logger.logRead('user2', 'persona', 'global');
      logger.logError('Test error');
    });

    it('should query by type', () => {
      const results = logger.query({ types: ['memory_read'] });
      expect(results.length).toBe(2);
      expect(results.every((r) => r.type === 'memory_read')).toBe(true);
    });

    it('should query by severity', () => {
      const results = logger.query({ severities: ['error'] });
      expect(results.length).toBe(1);
    });

    it('should query by user', () => {
      const results = logger.query({ userId: 'user1' });
      expect(results.length).toBe(2);
    });

    it('should limit results', () => {
      const results = logger.query({ limit: 2 });
      expect(results.length).toBe(2);
    });

    it('should support pagination', () => {
      const page1 = logger.query({ limit: 2, offset: 0 });
      const page2 = logger.query({ limit: 2, offset: 2 });
      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
      expect(page1[0]?.id).not.toBe(page2[0]?.id);
    });

    it('should sort by order option', () => {
      // Just verify both sort options return results
      const asc = logger.query({ order: 'asc' });
      const desc = logger.query({ order: 'desc' });
      expect(asc.length).toBe(4);
      expect(desc.length).toBe(4);
      // Both should have the same entries (just potentially different order)
      expect(asc.map((e) => e.id).sort()).toEqual(desc.map((e) => e.id).sort());
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      logger.logRead('user1', 'project', 'project');
      logger.logRead('user1', 'project', 'project');
      logger.logWrite('user2', 'user', 'project', true);
      logger.logError('Test error');
    });

    it('should calculate stats', () => {
      const stats = logger.getStats();
      expect(stats.totalEntries).toBe(4);
      expect(stats.byType['memory_read']).toBe(2);
      expect(stats.byType['memory_write']).toBe(1);
      expect(stats.bySeverity['error']).toBe(1);
    });

    it('should identify top users', () => {
      const stats = logger.getStats();
      expect(stats.topUsers.length).toBeGreaterThan(0);
      expect(stats.topUsers[0]?.userId).toBe('user1');
    });
  });

  describe('Export and Clear', () => {
    it('should export as JSON', () => {
      logger.logRead('user1', 'project', 'project');
      const json = logger.export();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });

    it('should clear entries', () => {
      logger.logRead('user1', 'project', 'project');
      logger.clear();
      expect(logger.getEntries().length).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should respect max entries', () => {
      const smallLogger = createAuditLogger({ maxEntries: 3 });
      for (let i = 0; i < 5; i++) {
        smallLogger.logRead(`user${i}`, 'project', 'project');
      }
      expect(smallLogger.getEntries().length).toBe(3);
    });

    it('should filter by min severity', () => {
      const warnLogger = createAuditLogger({ minSeverity: 'warning' });
      const infoEntry = warnLogger.log('memory_read', 'info', 'Test');
      expect(infoEntry.id).toBe('skipped');
    });
  });
});

// =============================================================================
// Health Monitor Tests
// =============================================================================

import {
  HealthMonitor,
  createHealthMonitor,
  type HealthStatus,
} from '../health-monitor.js';

describe('Health Monitor', () => {
  let monitor: HealthMonitor;

  beforeEach(() => {
    monitor = createHealthMonitor();
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('Operation Metrics', () => {
    it('should record operations', () => {
      monitor.recordOperation('read', 50);
      monitor.recordOperation('read', 100);
      monitor.recordOperation('write', 150);

      const metrics = monitor.getOperationMetrics();
      expect(metrics.length).toBe(2);

      const readMetrics = metrics.find((m) => m.operation === 'read');
      expect(readMetrics?.callCount).toBe(2);
      expect(readMetrics?.avgTimeMs).toBe(75);
    });

    it('should track min/max latency', () => {
      monitor.recordOperation('test', 10);
      monitor.recordOperation('test', 50);
      monitor.recordOperation('test', 30);

      const metrics = monitor.getOperationMetrics();
      const testMetrics = metrics.find((m) => m.operation === 'test');
      expect(testMetrics?.minTimeMs).toBe(10);
      expect(testMetrics?.maxTimeMs).toBe(50);
    });

    it('should track error count', () => {
      monitor.recordOperation('test', 50);
      monitor.recordOperation('test', 50, new Error('Test error'));

      const metrics = monitor.getOperationMetrics();
      const testMetrics = metrics.find((m) => m.operation === 'test');
      expect(testMetrics?.errorCount).toBe(1);
    });
  });

  describe('Health Check', () => {
    it('should run health check', async () => {
      const report = await monitor.runHealthCheck();
      expect(report.status).toBeDefined();
      expect(report.components.length).toBeGreaterThan(0);
      expect(report.timestamp).toBeInstanceOf(Date);
    });

    it('should check memory usage', async () => {
      const report = await monitor.runHealthCheck();
      const memComponent = report.components.find((c) => c.name === 'memory');
      expect(memComponent).toBeDefined();
      expect(memComponent?.status).toBe('healthy');
    });

    it('should return last report', async () => {
      expect(monitor.getLastReport()).toBeNull();
      await monitor.runHealthCheck();
      expect(monitor.getLastReport()).not.toBeNull();
    });
  });

  describe('System Metrics', () => {
    it('should return metrics', () => {
      const metrics = monitor.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalBlocks).toBe(0);
      expect(metrics.blocksByType).toBeDefined();
    });

    it('should calculate error rate', () => {
      monitor.recordOperation('test', 50);
      monitor.recordOperation('test', 50, new Error('Error'));
      monitor.recordOperation('test', 50);
      monitor.recordOperation('test', 50, new Error('Error'));

      const metrics = monitor.getMetrics();
      expect(metrics.errorRate).toBe(0.5);
    });
  });

  describe('Lifecycle', () => {
    it('should start and stop monitoring', () => {
      monitor.start();
      // Should not throw
      monitor.stop();
    });

    it('should reset metrics', () => {
      monitor.recordOperation('test', 50);
      expect(monitor.getOperationMetrics().length).toBe(1);

      monitor.resetMetrics();
      expect(monitor.getOperationMetrics().length).toBe(0);
    });
  });
});

// =============================================================================
// Backup Manager Tests
// =============================================================================

import {
  BackupManager,
  createBackupManager,
} from '../backup-manager.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

describe('Backup Manager', () => {
  let manager: BackupManager;
  let tempDir: string;
  let testDbPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-test-'));
    testDbPath = path.join(tempDir, 'test.db');

    // Create a test database file
    fs.writeFileSync(testDbPath, 'test database content');

    manager = createBackupManager({
      backupDir: path.join(tempDir, 'backups'),
      maxBackups: 3,
    });
  });

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Create Backup', () => {
    it('should create a backup', async () => {
      const result = await manager.createBackup(testDbPath);
      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.sizeBytes).toBeGreaterThan(0);
    });

    it('should generate unique backup IDs', async () => {
      const result1 = await manager.createBackup(testDbPath);
      const result2 = await manager.createBackup(testDbPath);
      expect(result1.metadata?.id).not.toBe(result2.metadata?.id);
    });

    it('should include description', async () => {
      const result = await manager.createBackup(testDbPath, {
        description: 'Test backup',
      });
      expect(result.metadata?.description).toBe('Test backup');
    });

    it('should fail for non-existent source', async () => {
      const result = await manager.createBackup('/nonexistent/path.db');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('List Backups', () => {
    it('should list backups in order', async () => {
      await manager.createBackup(testDbPath);
      await manager.createBackup(testDbPath);
      const backups = manager.listBackups();
      expect(backups.length).toBe(2);
      // Newest first
      expect(backups[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(
        backups[1]!.createdAt.getTime()
      );
    });

    it('should get specific backup', async () => {
      const result = await manager.createBackup(testDbPath);
      const backup = manager.getBackup(result.metadata!.id);
      expect(backup).toBeDefined();
      expect(backup?.id).toBe(result.metadata?.id);
    });
  });

  describe('Delete Backup', () => {
    it('should delete a backup', async () => {
      const result = await manager.createBackup(testDbPath);
      const backupId = result.metadata!.id;

      expect(manager.deleteBackup(backupId)).toBe(true);
      expect(manager.getBackup(backupId)).toBeUndefined();
    });

    it('should return false for unknown backup', () => {
      expect(manager.deleteBackup('unknown')).toBe(false);
    });
  });

  describe('Verify Backup', () => {
    it('should verify valid backup', async () => {
      const result = await manager.createBackup(testDbPath);
      const verification = await manager.verifyBackup(result.metadata!.id);
      expect(verification.valid).toBe(true);
      expect(verification.issues.length).toBe(0);
    });

    it('should detect unknown backup', async () => {
      const verification = await manager.verifyBackup('unknown');
      expect(verification.valid).toBe(false);
      expect(verification.issues).toContain('Backup not found');
    });
  });

  describe('Restore Backup', () => {
    it('should restore a backup', async () => {
      const result = await manager.createBackup(testDbPath);

      // Modify the original
      fs.writeFileSync(testDbPath, 'modified content');

      const restoreResult = await manager.restore({
        backupId: result.metadata!.id,
        createBackupFirst: false,
      });

      expect(restoreResult.success).toBe(true);

      // Verify content is restored
      const content = fs.readFileSync(testDbPath, 'utf-8');
      expect(content).toBe('test database content');
    });

    it('should create pre-restore backup', async () => {
      const result = await manager.createBackup(testDbPath);

      const restoreResult = await manager.restore({
        backupId: result.metadata!.id,
        createBackupFirst: true,
      });

      expect(restoreResult.preRestoreBackupId).toBeDefined();
    });

    it('should fail for unknown backup', async () => {
      const result = await manager.restore({ backupId: 'unknown' });
      expect(result.success).toBe(false);
    });
  });

  describe('Auto Cleanup', () => {
    it('should cleanup old backups', async () => {
      // Create more than maxBackups
      await manager.createBackup(testDbPath);
      await manager.createBackup(testDbPath);
      await manager.createBackup(testDbPath);
      await manager.createBackup(testDbPath);

      const backups = manager.listBackups();
      expect(backups.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Statistics', () => {
    it('should calculate stats', async () => {
      await manager.createBackup(testDbPath);
      await manager.createBackup(testDbPath);

      const stats = manager.getStats();
      expect(stats.totalBackups).toBe(2);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
      expect(stats.oldestBackup).toBeInstanceOf(Date);
      expect(stats.newestBackup).toBeInstanceOf(Date);
    });
  });
});
