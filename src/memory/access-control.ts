/**
 * Access Control Module
 *
 * Role-based access control (RBAC) for memory system.
 * Provides:
 * - Role definitions with permissions
 * - Permission checks for operations
 * - User role management
 */

import type { MemoryBlockType, MemoryScope } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Available roles in the system.
 */
export type Role = 'admin' | 'editor' | 'viewer' | 'guest';

/**
 * Operations that can be performed on memory.
 */
export type Operation =
  | 'read'
  | 'write'
  | 'delete'
  | 'export'
  | 'import'
  | 'search'
  | 'admin';

/**
 * Permission definition.
 */
export interface Permission {
  /** Operation being permitted */
  operation: Operation;
  /** Allowed block types (undefined = all) */
  blockTypes?: MemoryBlockType[];
  /** Allowed scopes (undefined = all) */
  scopes?: MemoryScope[];
}

/**
 * Role definition with permissions.
 */
export interface RoleDefinition {
  /** Role name */
  name: Role;
  /** Role description */
  description: string;
  /** Permissions granted to this role */
  permissions: Permission[];
}

/**
 * User with role assignment.
 */
export interface User {
  /** Unique user ID */
  id: string;
  /** Username */
  name: string;
  /** Assigned role */
  role: Role;
  /** When the user was created */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivity?: Date;
}

/**
 * Access check result.
 */
export interface AccessCheckResult {
  /** Whether access is granted */
  allowed: boolean;
  /** Reason for denial (if denied) */
  reason?: string;
  /** Required role for this operation */
  requiredRole?: Role;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default role definitions.
 */
export const DEFAULT_ROLES: Record<Role, RoleDefinition> = {
  admin: {
    name: 'admin',
    description: 'Full access to all memory operations',
    permissions: [
      { operation: 'read' },
      { operation: 'write' },
      { operation: 'delete' },
      { operation: 'export' },
      { operation: 'import' },
      { operation: 'search' },
      { operation: 'admin' },
    ],
  },
  editor: {
    name: 'editor',
    description: 'Can read, write, search, and export memory',
    permissions: [
      { operation: 'read' },
      { operation: 'write' },
      { operation: 'search' },
      { operation: 'export' },
    ],
  },
  viewer: {
    name: 'viewer',
    description: 'Can only read and search memory',
    permissions: [
      { operation: 'read' },
      { operation: 'search' },
    ],
  },
  guest: {
    name: 'guest',
    description: 'Minimal access - can only read project scope',
    permissions: [
      { operation: 'read', scopes: ['project'] },
      { operation: 'search', scopes: ['project'] },
    ],
  },
};

/**
 * Role hierarchy (higher index = more privileges).
 */
const ROLE_HIERARCHY: Role[] = ['guest', 'viewer', 'editor', 'admin'];

// =============================================================================
// AccessControl Class
// =============================================================================

/**
 * Access control manager for memory operations.
 */
export class AccessControl {
  private roles: Map<Role, RoleDefinition>;
  private users: Map<string, User>;
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.roles = new Map(Object.entries(DEFAULT_ROLES) as [Role, RoleDefinition][]);
    this.users = new Map();
    this.enabled = enabled;
  }

  /**
   * Enable or disable access control.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if access control is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Register a user with a role.
   */
  registerUser(id: string, name: string, role: Role): User {
    const user: User = {
      id,
      name,
      role,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  /**
   * Get a user by ID.
   */
  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  /**
   * Update a user's role.
   */
  updateUserRole(userId: string, newRole: Role): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    user.role = newRole;
    return true;
  }

  /**
   * Update user's last activity timestamp.
   */
  updateLastActivity(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.lastActivity = new Date();
    }
  }

  /**
   * Remove a user.
   */
  removeUser(userId: string): boolean {
    return this.users.delete(userId);
  }

  /**
   * Get all users.
   */
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * Check if a user can perform an operation.
   */
  checkAccess(
    userId: string,
    operation: Operation,
    blockType?: MemoryBlockType,
    scope?: MemoryScope
  ): AccessCheckResult {
    // If access control is disabled, allow everything
    if (!this.enabled) {
      return { allowed: true };
    }

    const user = this.users.get(userId);
    if (!user) {
      return {
        allowed: false,
        reason: 'User not found',
      };
    }

    const roleDefinition = this.roles.get(user.role);
    if (!roleDefinition) {
      return {
        allowed: false,
        reason: 'Role not found',
      };
    }

    // Check if any permission allows this operation
    for (const permission of roleDefinition.permissions) {
      if (permission.operation !== operation) continue;

      // Check block type restriction
      if (permission.blockTypes && blockType && !permission.blockTypes.includes(blockType)) {
        continue;
      }

      // Check scope restriction
      if (permission.scopes && scope && !permission.scopes.includes(scope)) {
        continue;
      }

      // Permission granted
      return { allowed: true };
    }

    // Find required role for this operation
    const requiredRole = this.findRequiredRole(operation, blockType, scope);

    return {
      allowed: false,
      reason: `Operation '${operation}' not permitted for role '${user.role}'`,
      requiredRole,
    };
  }

  /**
   * Compare two roles.
   * Returns: -1 if role1 < role2, 0 if equal, 1 if role1 > role2
   */
  compareRoles(role1: Role, role2: Role): number {
    const index1 = ROLE_HIERARCHY.indexOf(role1);
    const index2 = ROLE_HIERARCHY.indexOf(role2);
    return Math.sign(index1 - index2);
  }

  /**
   * Check if a role has at least the privileges of another role.
   */
  roleHasAtLeast(role: Role, requiredRole: Role): boolean {
    return this.compareRoles(role, requiredRole) >= 0;
  }

  /**
   * Get a role definition.
   */
  getRole(role: Role): RoleDefinition | undefined {
    return this.roles.get(role);
  }

  /**
   * Define or update a custom role.
   */
  defineRole(role: Role, definition: RoleDefinition): void {
    this.roles.set(role, definition);
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private findRequiredRole(
    operation: Operation,
    _blockType?: MemoryBlockType,
    _scope?: MemoryScope
  ): Role | undefined {
    // Find the lowest role that can perform this operation
    for (const role of ROLE_HIERARCHY) {
      const roleDef = this.roles.get(role);
      if (roleDef?.permissions.some((p) => p.operation === operation)) {
        return role;
      }
    }
    return undefined;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an access control instance.
 *
 * @param enabled - Whether access control is enabled (default: true)
 * @returns AccessControl instance
 */
export function createAccessControl(enabled: boolean = true): AccessControl {
  return new AccessControl(enabled);
}

// =============================================================================
// Singleton Instance
// =============================================================================

let _accessControl: AccessControl | null = null;

/**
 * Get the global access control instance.
 */
export function getAccessControl(): AccessControl {
  if (!_accessControl) {
    _accessControl = new AccessControl();
  }
  return _accessControl;
}

/**
 * Reset the global access control instance.
 */
export function resetAccessControl(): void {
  _accessControl = null;
}
