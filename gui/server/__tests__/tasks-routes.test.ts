/**
 * Tasks Routes Tests
 *
 * Tests for tasks API routes including pagination.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Hono } from 'hono';
import { tasksRoutes } from '../routes/tasks.js';
import type { Variables } from '../types.js';

const TEST_DIR = '/tmp/tasks-routes-test';
const SPECS_DIR = join(TEST_DIR, '.yoyo-dev', 'specs');

// Create test app with project root middleware
function createTestApp() {
  const app = new Hono<{ Variables: Variables }>();
  app.use('*', async (c, next) => {
    c.set('projectRoot', TEST_DIR);
    await next();
  });
  app.route('/api/tasks', tasksRoutes);
  return app;
}

// Helper to create a spec with tasks
function createSpec(name: string, tasks: string) {
  const specDir = join(SPECS_DIR, name);
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(specDir, 'tasks.md'), tasks);
}

describe('Tasks Routes', () => {
  beforeEach(() => {
    mkdirSync(SPECS_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('GET /api/tasks - Pagination', () => {
    beforeEach(() => {
      // Create 15 test specs
      for (let i = 1; i <= 15; i++) {
        const date = `2026-01-${String(i).padStart(2, '0')}`;
        createSpec(`${date}-spec-${i}`, `# Tasks\n\n## 1. Task Group\n- [ ] Task ${i}\n`);
      }
    });

    it('should return first 10 specs by default', async () => {
      const app = createTestApp();
      const res = await app.request('/api/tasks');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.specs).toHaveLength(10);
      expect(data.pagination).toEqual({
        offset: 0,
        limit: 10,
        total: 15,
        hasMore: true,
      });
    });

    it('should respect limit parameter', async () => {
      const app = createTestApp();
      const res = await app.request('/api/tasks?limit=5');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.specs).toHaveLength(5);
      expect(data.pagination).toEqual({
        offset: 0,
        limit: 5,
        total: 15,
        hasMore: true,
      });
    });

    it('should respect offset parameter', async () => {
      const app = createTestApp();
      const res = await app.request('/api/tasks?offset=10');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.specs).toHaveLength(5); // Only 5 remaining after offset 10
      expect(data.pagination).toEqual({
        offset: 10,
        limit: 10,
        total: 15,
        hasMore: false,
      });
    });

    it('should handle limit and offset together', async () => {
      const app = createTestApp();
      const res = await app.request('/api/tasks?limit=3&offset=5');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.specs).toHaveLength(3);
      expect(data.pagination).toEqual({
        offset: 5,
        limit: 3,
        total: 15,
        hasMore: true,
      });
    });

    it('should return hasMore=false when no more specs', async () => {
      const app = createTestApp();
      const res = await app.request('/api/tasks?limit=20');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.specs).toHaveLength(15);
      expect(data.pagination.hasMore).toBe(false);
    });

    it('should return empty specs array when offset exceeds total', async () => {
      const app = createTestApp();
      const res = await app.request('/api/tasks?offset=100');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.specs).toHaveLength(0);
      expect(data.pagination).toEqual({
        offset: 100,
        limit: 10,
        total: 15,
        hasMore: false,
      });
    });

    it('should still return summary totals for all specs', async () => {
      const app = createTestApp();
      const res = await app.request('/api/tasks?limit=5');
      const data = await res.json();

      expect(res.status).toBe(200);
      // Summary should reflect ALL specs, not just paginated ones
      expect(data.summary.totalSpecs).toBe(15);
      expect(data.summary.totalTasks).toBe(15); // 1 task per spec
    });

    it('should handle invalid limit gracefully', async () => {
      const app = createTestApp();
      const res = await app.request('/api/tasks?limit=-5');
      const data = await res.json();

      expect(res.status).toBe(200);
      // Should use default limit of 10
      expect(data.pagination.limit).toBe(10);
    });

    it('should handle invalid offset gracefully', async () => {
      const app = createTestApp();
      const res = await app.request('/api/tasks?offset=-5');
      const data = await res.json();

      expect(res.status).toBe(200);
      // Should use default offset of 0
      expect(data.pagination.offset).toBe(0);
    });

    it('should cap limit at maximum of 100', async () => {
      const app = createTestApp();
      const res = await app.request('/api/tasks?limit=500');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.pagination.limit).toBe(100);
    });
  });

  describe('GET /api/tasks - No specs', () => {
    it('should return empty response with pagination when no specs exist', async () => {
      const app = createTestApp();
      const res = await app.request('/api/tasks');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.specs).toHaveLength(0);
      expect(data.pagination).toEqual({
        offset: 0,
        limit: 10,
        total: 0,
        hasMore: false,
      });
      expect(data.summary.totalSpecs).toBe(0);
    });
  });
});
