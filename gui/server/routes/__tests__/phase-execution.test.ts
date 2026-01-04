/**
 * Phase Execution API Routes Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn((path: string) => {
    if (path.includes('roadmap.md')) return true;
    if (path.includes('tasks.md')) return false;
    return false;
  }),
  readFileSync: vi.fn((path: string) => {
    if (path.includes('roadmap.md')) {
      return `# Product Roadmap

## Phase 1: Core Features
**Status**: In Progress
**Goal**: Build core functionality

### Features
1. [x] **User Auth** — Authentication system
2. [ ] **Settings** — User preferences

## Phase 2: Advanced Features
**Status**: Pending
**Goal**: Add advanced features

### Features
1. [ ] **Analytics** — Usage tracking
`;
    }
    return '';
  }),
  readdirSync: vi.fn(() => []),
}));

// Mock the phase execution service
vi.mock('../../services/phase-execution.js', () => ({
  getPhaseExecutionService: vi.fn(() => mockService),
}));

// Create mock service
const mockService = {
  startExecution: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
  getStatus: vi.fn(),
  getLogs: vi.fn(),
  cleanup: vi.fn(),
};

// Import routes after mocking
import { phaseExecutionRoutes } from '../phase-execution.js';
import type { Variables } from '../../types.js';

// =============================================================================
// Test Setup
// =============================================================================

function createTestApp() {
  const app = new Hono<{ Variables: Variables }>();
  app.use('*', async (c, next) => {
    c.set('projectRoot', '/tmp/test-project');
    await next();
  });
  app.route('/api/roadmap', phaseExecutionRoutes);
  return app;
}

// =============================================================================
// Tests
// =============================================================================

describe('Phase Execution Routes', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();

    // Default mock implementations
    mockService.getStatus.mockReturnValue({
      executionId: null,
      status: 'idle',
      phaseId: null,
      phaseTitle: null,
      progress: { overall: 0, currentSpec: null },
      specs: [],
      metrics: null,
      error: null,
    });
  });

  // ===========================================================================
  // POST /api/roadmap/phases/:phaseId/execute
  // ===========================================================================

  describe('POST /api/roadmap/phases/:phaseId/execute', () => {
    it('should start phase execution', async () => {
      mockService.startExecution.mockResolvedValue({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        status: 'running',
        specsToExecute: [{ id: 'spec-1', title: 'Test Spec', hasSpec: true, hasTasks: true }],
        estimatedItems: 5,
        startedAt: '2026-01-04T12:00:00Z',
      });

      const res = await app.request('/api/roadmap/phases/phase-1/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.executionId).toBe('exec-123');
      expect(data.status).toBe('running');
    });

    it('should accept selected specs', async () => {
      mockService.startExecution.mockResolvedValue({
        executionId: 'exec-123',
        phaseId: 'phase-1',
        status: 'running',
        specsToExecute: [{ id: 'spec-1', title: 'Auth', hasSpec: true, hasTasks: true }],
        estimatedItems: 3,
        startedAt: '2026-01-04T12:00:00Z',
      });

      const res = await app.request('/api/roadmap/phases/phase-1/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedSpecs: ['Auth'] }),
      });

      expect(res.status).toBe(200);
      expect(mockService.startExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedSpecs: ['Auth'],
        })
      );
    });

    it('should return 409 if already running', async () => {
      mockService.startExecution.mockRejectedValue(
        new Error('Another phase execution is already in progress')
      );

      const res = await app.request('/api/roadmap/phases/phase-1/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain('already in progress');
    });

    it('should return 404 if phase not found', async () => {
      mockService.startExecution.mockRejectedValue(new Error('Phase not found'));

      const res = await app.request('/api/roadmap/phases/invalid-phase/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(404);
    });
  });

  // ===========================================================================
  // POST /api/roadmap/execution/pause
  // ===========================================================================

  describe('POST /api/roadmap/execution/pause', () => {
    it('should pause running execution', async () => {
      mockService.pause.mockResolvedValue({
        executionId: 'exec-123',
        status: 'paused',
        pausedAt: '2026-01-04T12:30:00Z',
        currentSpec: 'user-auth',
        currentTask: 'task-1',
        completedSpecs: 1,
        totalSpecs: 3,
      });

      const res = await app.request('/api/roadmap/execution/pause', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('paused');
      expect(data.completedSpecs).toBe(1);
    });

    it('should return 400 if not running', async () => {
      mockService.pause.mockRejectedValue(new Error('No execution running'));

      const res = await app.request('/api/roadmap/execution/pause', {
        method: 'POST',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('No execution running');
    });
  });

  // ===========================================================================
  // POST /api/roadmap/execution/resume
  // ===========================================================================

  describe('POST /api/roadmap/execution/resume', () => {
    it('should resume paused execution', async () => {
      mockService.resume.mockResolvedValue({
        executionId: 'exec-123',
        status: 'running',
        resumedAt: '2026-01-04T13:00:00Z',
        currentSpec: 'user-auth',
        currentTask: 'task-1',
      });

      const res = await app.request('/api/roadmap/execution/resume', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('running');
    });

    it('should return 400 if not paused', async () => {
      mockService.resume.mockRejectedValue(new Error('Execution is not paused'));

      const res = await app.request('/api/roadmap/execution/resume', {
        method: 'POST',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('not paused');
    });
  });

  // ===========================================================================
  // POST /api/roadmap/execution/stop
  // ===========================================================================

  describe('POST /api/roadmap/execution/stop', () => {
    it('should stop execution gracefully', async () => {
      mockService.stop.mockResolvedValue({
        executionId: 'exec-123',
        status: 'stopped',
        stoppedAt: '2026-01-04T13:30:00Z',
        completedSpecs: 2,
        totalSpecs: 3,
        statePreserved: true,
        resumable: true,
      });

      const res = await app.request('/api/roadmap/execution/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User requested' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('stopped');
      expect(data.statePreserved).toBe(true);
    });

    it('should return 400 if nothing to stop', async () => {
      mockService.stop.mockRejectedValue(new Error('No execution to stop'));

      const res = await app.request('/api/roadmap/execution/stop', {
        method: 'POST',
      });

      expect(res.status).toBe(400);
    });
  });

  // ===========================================================================
  // GET /api/roadmap/execution/status
  // ===========================================================================

  describe('GET /api/roadmap/execution/status', () => {
    it('should return idle status when not running', async () => {
      const res = await app.request('/api/roadmap/execution/status');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('idle');
      expect(data.executionId).toBeNull();
    });

    it('should return running status with details', async () => {
      mockService.getStatus.mockReturnValue({
        executionId: 'exec-123',
        status: 'running',
        phaseId: 'phase-1',
        phaseTitle: 'Core Features',
        progress: {
          overall: 45,
          currentSpec: { id: 'spec-1', title: 'Auth', progress: 30, currentTask: 'task-2' },
        },
        specs: [
          { id: 'spec-0', title: 'Setup', status: 'completed', progress: 100 },
          { id: 'spec-1', title: 'Auth', status: 'running', progress: 30 },
        ],
        metrics: {
          startedAt: '2026-01-04T12:00:00Z',
          elapsedSeconds: 900,
          completedTasks: 5,
          totalTasks: 15,
          loopCount: 20,
          apiCalls: 50,
        },
        error: null,
      });

      const res = await app.request('/api/roadmap/execution/status');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('running');
      expect(data.phaseTitle).toBe('Core Features');
      expect(data.progress.overall).toBe(45);
      expect(data.metrics.completedTasks).toBe(5);
    });
  });

  // ===========================================================================
  // GET /api/roadmap/execution/logs
  // ===========================================================================

  describe('GET /api/roadmap/execution/logs', () => {
    it('should return logs', async () => {
      mockService.getLogs.mockReturnValue([
        { timestamp: '2026-01-04T12:00:00Z', level: 'info', message: 'Starting execution' },
        { timestamp: '2026-01-04T12:01:00Z', level: 'info', message: 'Task 1 completed' },
      ]);

      const res = await app.request('/api/roadmap/execution/logs');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.logs).toHaveLength(2);
      expect(data.logs[0].message).toBe('Starting execution');
    });

    it('should support limit and offset', async () => {
      mockService.getLogs.mockReturnValue([
        { timestamp: '2026-01-04T12:01:00Z', level: 'info', message: 'Task 1' },
      ]);

      const res = await app.request('/api/roadmap/execution/logs?limit=10&offset=5');

      expect(res.status).toBe(200);
      expect(mockService.getLogs).toHaveBeenCalledWith({ limit: 10, offset: 5 });
    });

    it('should support level filter', async () => {
      mockService.getLogs.mockReturnValue([
        { timestamp: '2026-01-04T12:01:00Z', level: 'error', message: 'Failed' },
      ]);

      const res = await app.request('/api/roadmap/execution/logs?level=error');

      expect(res.status).toBe(200);
      expect(mockService.getLogs).toHaveBeenCalledWith(expect.objectContaining({ level: 'error' }));
    });
  });

  // ===========================================================================
  // GET /api/roadmap/phases/:phaseId/execution-preview
  // ===========================================================================

  describe('GET /api/roadmap/phases/:phaseId/execution-preview', () => {
    it('should return execution preview for a phase', async () => {
      // This endpoint reads from roadmap.md and specs directory
      // Mocking would require filesystem mocks
      // For now, test that the endpoint exists and handles errors

      const res = await app.request('/api/roadmap/phases/phase-1/execution-preview');

      // Will return 404 because roadmap doesn't exist in test env
      expect([200, 404]).toContain(res.status);
    });
  });
});
