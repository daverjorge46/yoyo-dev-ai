/**
 * Kanban State Tests
 *
 * Tests for kanban-state.json read/write functions that persist
 * task column positions across page refreshes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  readKanbanState,
  writeKanbanState,
  getTaskColumn,
  type KanbanState,
  type ColumnId,
} from '../lib/kanban-state.js';

const TEST_DIR = '/tmp/kanban-state-test';
const TEST_SPEC_DIR = join(TEST_DIR, '.yoyo-dev', 'specs', '2026-01-02-test-spec');

describe('kanban-state', () => {
  beforeEach(() => {
    // Create test directory structure
    mkdirSync(TEST_SPEC_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('readKanbanState', () => {
    it('should return empty state when file does not exist', () => {
      const state = readKanbanState(TEST_SPEC_DIR);
      expect(state).toEqual({ columns: {} });
    });

    it('should read existing kanban-state.json', () => {
      const testState: KanbanState = {
        columns: {
          '1.1': 'in_progress',
          '1.2': 'review',
          '2.1': 'backlog',
        },
        updatedAt: '2026-01-02T10:30:00Z',
      };
      writeFileSync(
        join(TEST_SPEC_DIR, 'kanban-state.json'),
        JSON.stringify(testState, null, 2)
      );

      const state = readKanbanState(TEST_SPEC_DIR);
      expect(state.columns).toEqual(testState.columns);
      expect(state.updatedAt).toBe(testState.updatedAt);
    });

    it('should return empty state on invalid JSON', () => {
      writeFileSync(join(TEST_SPEC_DIR, 'kanban-state.json'), 'not valid json');

      const state = readKanbanState(TEST_SPEC_DIR);
      expect(state).toEqual({ columns: {} });
    });
  });

  describe('writeKanbanState', () => {
    it('should create kanban-state.json with column data', () => {
      const columns: Record<string, ColumnId> = {
        '1.1': 'in_progress',
        '2.1': 'review',
      };

      writeKanbanState(TEST_SPEC_DIR, columns);

      const filePath = join(TEST_SPEC_DIR, 'kanban-state.json');
      expect(existsSync(filePath)).toBe(true);

      const content = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(content.columns).toEqual(columns);
      expect(content.updatedAt).toBeDefined();
    });

    it('should update existing kanban-state.json', () => {
      // Write initial state
      writeKanbanState(TEST_SPEC_DIR, { '1.1': 'backlog' });

      // Update with new column
      writeKanbanState(TEST_SPEC_DIR, { '1.1': 'in_progress', '1.2': 'review' });

      const filePath = join(TEST_SPEC_DIR, 'kanban-state.json');
      const content = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(content.columns).toEqual({ '1.1': 'in_progress', '1.2': 'review' });
    });

    it('should merge with existing columns when updating single task', () => {
      // Write initial state with multiple columns
      writeKanbanState(TEST_SPEC_DIR, { '1.1': 'backlog', '2.1': 'review' });

      // Read current state
      const currentState = readKanbanState(TEST_SPEC_DIR);

      // Update single task column
      const updatedColumns: Record<string, ColumnId> = { ...currentState.columns, '1.1': 'in_progress' };
      writeKanbanState(TEST_SPEC_DIR, updatedColumns);

      const content = JSON.parse(
        readFileSync(join(TEST_SPEC_DIR, 'kanban-state.json'), 'utf-8')
      );
      expect(content.columns).toEqual({ '1.1': 'in_progress', '2.1': 'review' });
    });
  });

  describe('getTaskColumn', () => {
    it('should return column from state if present', () => {
      const state: KanbanState = {
        columns: { '1.1': 'in_progress', '1.2': 'review' },
      };

      expect(getTaskColumn(state, '1.1', 'pending')).toBe('in_progress');
      expect(getTaskColumn(state, '1.2', 'pending')).toBe('review');
    });

    it('should return "completed" for completed tasks not in state', () => {
      const state: KanbanState = { columns: {} };

      expect(getTaskColumn(state, '1.1', 'completed')).toBe('completed');
    });

    it('should return "backlog" for pending tasks not in state', () => {
      const state: KanbanState = { columns: {} };

      expect(getTaskColumn(state, '1.1', 'pending')).toBe('backlog');
    });

    it('should use state column over status-based default', () => {
      const state: KanbanState = {
        columns: { '1.1': 'review' },
      };

      // Even though task is pending, state says review
      expect(getTaskColumn(state, '1.1', 'pending')).toBe('review');
    });
  });
});
