/**
 * Memory Admin API Routes
 *
 * Provides enterprise management endpoints for backup/restore,
 * access control, audit logs, and health monitoring.
 */

import { Hono } from 'hono';
import type { Variables } from '../types.js';

export const memoryAdminRoutes = new Hono<{ Variables: Variables }>();

// =============================================================================
// Types
// =============================================================================

interface BackupRequest {
  name?: string;
  compress?: boolean;
  includeAttachments?: boolean;
}

interface RestoreRequest {
  backupId: string;
  validateFirst?: boolean;
}

interface UserCreateRequest {
  id: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer' | 'guest';
}

interface UserUpdateRequest {
  role?: 'admin' | 'editor' | 'viewer' | 'guest';
  name?: string;
}

interface AuditQueryRequest {
  type?: string;
  severity?: string;
  userId?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}

interface BackupInfo {
  id: string;
  name: string;
  createdAt: string;
  size: number;
  compressed: boolean;
  checksum: string;
}

interface UserInfo {
  id: string;
  name: string;
  role: string;
  createdAt: string;
  lastActive?: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  type: string;
  severity: string;
  userId?: string;
  description: string;
  details?: Record<string, unknown>;
}

interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  components: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    message?: string;
    latencyMs?: number;
  }>;
  metrics: {
    memoryUsageMB: number;
    cpuUsagePercent: number;
    activeConnections: number;
    avgLatencyMs: number;
  };
}

// =============================================================================
// Backup Routes
// =============================================================================

// GET /api/memory/admin/backups - List all backups
memoryAdminRoutes.get('/backups', async (c) => {
  const backups = listBackups();
  return c.json({ backups, count: backups.length });
});

// POST /api/memory/admin/backups - Create a new backup
memoryAdminRoutes.post('/backups', async (c) => {
  try {
    const body = await c.req.json<BackupRequest>();
    const result = await createBackup(body);
    return c.json(result, 201);
  } catch (error) {
    return c.json({ error: 'Backup creation failed' }, 500);
  }
});

// GET /api/memory/admin/backups/:id - Get backup details
memoryAdminRoutes.get('/backups/:id', async (c) => {
  const id = c.req.param('id');
  const backup = getBackup(id);

  if (!backup) {
    return c.json({ error: 'Backup not found' }, 404);
  }

  return c.json(backup);
});

// POST /api/memory/admin/backups/:id/restore - Restore from backup
memoryAdminRoutes.post('/backups/:id/restore', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<Partial<RestoreRequest>>();

    const result = await restoreBackup({
      backupId: id,
      validateFirst: body.validateFirst ?? true,
    });

    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Restore failed' }, 500);
  }
});

// POST /api/memory/admin/backups/:id/verify - Verify backup integrity
memoryAdminRoutes.post('/backups/:id/verify', async (c) => {
  const id = c.req.param('id');
  const result = verifyBackup(id);
  return c.json(result);
});

// DELETE /api/memory/admin/backups/:id - Delete a backup
memoryAdminRoutes.delete('/backups/:id', async (c) => {
  const id = c.req.param('id');
  const deleted = deleteBackup(id);

  if (!deleted) {
    return c.json({ error: 'Backup not found' }, 404);
  }

  return c.json({ success: true, message: 'Backup deleted' });
});

// =============================================================================
// Access Control Routes
// =============================================================================

// GET /api/memory/admin/users - List all users
memoryAdminRoutes.get('/users', async (c) => {
  const users = listUsers();
  return c.json({ users, count: users.length });
});

// POST /api/memory/admin/users - Create a new user
memoryAdminRoutes.post('/users', async (c) => {
  try {
    const body = await c.req.json<UserCreateRequest>();

    if (!body.id || !body.name || !body.role) {
      return c.json({ error: 'id, name, and role are required' }, 400);
    }

    const validRoles = ['admin', 'editor', 'viewer', 'guest'];
    if (!validRoles.includes(body.role)) {
      return c.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, 400);
    }

    const user = createUser(body);
    return c.json(user, 201);
  } catch (error) {
    return c.json({ error: 'User creation failed' }, 500);
  }
});

// GET /api/memory/admin/users/:id - Get user details
memoryAdminRoutes.get('/users/:id', async (c) => {
  const id = c.req.param('id');
  const user = getUser(id);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(user);
});

// PATCH /api/memory/admin/users/:id - Update user
memoryAdminRoutes.patch('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<UserUpdateRequest>();

    const updated = updateUser(id, body);
    if (!updated) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(updated);
  } catch (error) {
    return c.json({ error: 'User update failed' }, 500);
  }
});

// DELETE /api/memory/admin/users/:id - Delete user
memoryAdminRoutes.delete('/users/:id', async (c) => {
  const id = c.req.param('id');
  const deleted = deleteUser(id);

  if (!deleted) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ success: true, message: 'User deleted' });
});

// POST /api/memory/admin/users/:id/check-access - Check user access
memoryAdminRoutes.post('/users/:id/check-access', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<{ operation: string; blockType?: string; scope?: string }>();

    if (!body.operation) {
      return c.json({ error: 'operation is required' }, 400);
    }

    const result = checkUserAccess(id, body.operation, body.blockType, body.scope);
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Access check failed' }, 500);
  }
});

// =============================================================================
// Audit Log Routes
// =============================================================================

// GET /api/memory/admin/audit - Query audit logs
memoryAdminRoutes.get('/audit', async (c) => {
  const options: AuditQueryRequest = {
    type: c.req.query('type'),
    severity: c.req.query('severity'),
    userId: c.req.query('userId'),
    startTime: c.req.query('startTime'),
    endTime: c.req.query('endTime'),
    limit: parseInt(c.req.query('limit') || '100', 10),
    offset: parseInt(c.req.query('offset') || '0', 10),
  };

  const entries = queryAuditLogs(options);
  return c.json({
    entries,
    count: entries.length,
    limit: options.limit,
    offset: options.offset,
  });
});

// GET /api/memory/admin/audit/stats - Get audit statistics
memoryAdminRoutes.get('/audit/stats', async (c) => {
  const stats = getAuditStats();
  return c.json(stats);
});

// POST /api/memory/admin/audit/export - Export audit logs
memoryAdminRoutes.post('/audit/export', async (c) => {
  try {
    const body = await c.req.json<AuditQueryRequest>();
    const entries = queryAuditLogs(body);

    return c.json({
      exported: entries.length,
      format: 'json',
      data: entries,
    });
  } catch (error) {
    return c.json({ error: 'Export failed' }, 500);
  }
});

// =============================================================================
// Health Monitoring Routes
// =============================================================================

// GET /api/memory/admin/health - Get health status
memoryAdminRoutes.get('/health', async (c) => {
  const report = await getHealthReport();

  const statusCode = report.status === 'healthy' ? 200 :
                     report.status === 'degraded' ? 200 : 503;

  return c.json(report, statusCode);
});

// GET /api/memory/admin/health/components - Get component health
memoryAdminRoutes.get('/health/components', async (c) => {
  const report = await getHealthReport();
  return c.json({ components: report.components });
});

// GET /api/memory/admin/health/metrics - Get system metrics
memoryAdminRoutes.get('/health/metrics', async (c) => {
  const report = await getHealthReport();
  return c.json(report.metrics);
});

// =============================================================================
// Implementation (Simplified)
// =============================================================================

// In-memory storage for demo purposes
let backups: BackupInfo[] = [];
let users: UserInfo[] = [
  { id: 'system', name: 'System', role: 'admin', createdAt: new Date().toISOString() },
];
let auditLog: AuditEntry[] = [];

function listBackups(): BackupInfo[] {
  return [...backups].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function createBackup(options: BackupRequest): Promise<BackupInfo> {
  const backup: BackupInfo = {
    id: `backup_${Date.now()}`,
    name: options.name || `Backup ${new Date().toISOString()}`,
    createdAt: new Date().toISOString(),
    size: Math.floor(Math.random() * 10000000), // Simulated size
    compressed: options.compress ?? true,
    checksum: `sha256:${Math.random().toString(36).substring(2, 15)}`,
  };

  backups.push(backup);
  logAudit('backup_created', 'info', `Created backup: ${backup.name}`);

  return backup;
}

function getBackup(id: string): BackupInfo | undefined {
  return backups.find(b => b.id === id);
}

async function restoreBackup(options: RestoreRequest): Promise<{ success: boolean; message: string }> {
  const backup = getBackup(options.backupId);
  if (!backup) {
    throw new Error('Backup not found');
  }

  logAudit('backup_restored', 'warning', `Restored from backup: ${backup.name}`);

  return {
    success: true,
    message: `Successfully restored from backup: ${backup.name}`,
  };
}

function verifyBackup(id: string): { valid: boolean; checksum?: string; error?: string } {
  const backup = getBackup(id);
  if (!backup) {
    return { valid: false, error: 'Backup not found' };
  }

  return { valid: true, checksum: backup.checksum };
}

function deleteBackup(id: string): boolean {
  const index = backups.findIndex(b => b.id === id);
  if (index === -1) return false;

  const backup = backups[index];
  backups.splice(index, 1);
  logAudit('backup_deleted', 'info', `Deleted backup: ${backup.name}`);

  return true;
}

function listUsers(): UserInfo[] {
  return [...users];
}

function createUser(input: UserCreateRequest): UserInfo {
  const user: UserInfo = {
    id: input.id,
    name: input.name,
    role: input.role,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  logAudit('user_created', 'info', `Created user: ${user.name} (${user.role})`);

  return user;
}

function getUser(id: string): UserInfo | undefined {
  return users.find(u => u.id === id);
}

function updateUser(id: string, updates: UserUpdateRequest): UserInfo | null {
  const user = users.find(u => u.id === id);
  if (!user) return null;

  if (updates.name) user.name = updates.name;
  if (updates.role) user.role = updates.role;

  logAudit('user_updated', 'info', `Updated user: ${user.name}`);

  return user;
}

function deleteUser(id: string): boolean {
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return false;

  if (users[index].id === 'system') {
    return false; // Can't delete system user
  }

  const user = users[index];
  users.splice(index, 1);
  logAudit('user_deleted', 'warning', `Deleted user: ${user.name}`);

  return true;
}

function checkUserAccess(
  userId: string,
  operation: string,
  _blockType?: string,
  _scope?: string
): { allowed: boolean; reason?: string } {
  const user = getUser(userId);
  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  const rolePermissions: Record<string, string[]> = {
    admin: ['read', 'write', 'delete', 'export', 'import', 'search', 'admin'],
    editor: ['read', 'write', 'search', 'export'],
    viewer: ['read', 'search'],
    guest: ['read'],
  };

  const permissions = rolePermissions[user.role] || [];
  const allowed = permissions.includes(operation);

  return {
    allowed,
    reason: allowed ? undefined : `Role ${user.role} does not have ${operation} permission`,
  };
}

function logAudit(type: string, severity: string, description: string): void {
  auditLog.push({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    type,
    severity,
    description,
  });
}

function queryAuditLogs(options: AuditQueryRequest): AuditEntry[] {
  let entries = [...auditLog];

  if (options.type) {
    entries = entries.filter(e => e.type === options.type);
  }
  if (options.severity) {
    entries = entries.filter(e => e.severity === options.severity);
  }
  if (options.userId) {
    entries = entries.filter(e => e.userId === options.userId);
  }
  if (options.startTime) {
    const start = new Date(options.startTime);
    entries = entries.filter(e => new Date(e.timestamp) >= start);
  }
  if (options.endTime) {
    const end = new Date(options.endTime);
    entries = entries.filter(e => new Date(e.timestamp) <= end);
  }

  // Sort by timestamp descending
  entries.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Apply pagination
  const offset = options.offset || 0;
  const limit = options.limit || 100;

  return entries.slice(offset, offset + limit);
}

function getAuditStats(): {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentActivity: number;
} {
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const oneHourAgo = Date.now() - 3600000;
  let recentActivity = 0;

  for (const entry of auditLog) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
    bySeverity[entry.severity] = (bySeverity[entry.severity] || 0) + 1;

    if (new Date(entry.timestamp).getTime() > oneHourAgo) {
      recentActivity++;
    }
  }

  return {
    total: auditLog.length,
    byType,
    bySeverity,
    recentActivity,
  };
}

async function getHealthReport(): Promise<HealthReport> {
  const components: Array<{ name: string; status: 'healthy' | 'degraded' | 'unhealthy'; latencyMs: number }> = [
    { name: 'database', status: 'healthy', latencyMs: 5 },
    { name: 'memory', status: 'healthy', latencyMs: 1 },
    { name: 'search', status: 'healthy', latencyMs: 15 },
    { name: 'backup', status: 'healthy', latencyMs: 2 },
  ];

  const allHealthy = components.every(c => c.status === 'healthy');
  const anyUnhealthy = components.some(c => c.status === 'unhealthy');

  return {
    status: anyUnhealthy ? 'unhealthy' : (allHealthy ? 'healthy' : 'degraded'),
    timestamp: new Date().toISOString(),
    components,
    metrics: {
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      cpuUsagePercent: 0, // Would require actual measurement
      activeConnections: 1,
      avgLatencyMs: components.reduce((sum, c) => sum + (c.latencyMs || 0), 0) / components.length,
    },
  };
}
