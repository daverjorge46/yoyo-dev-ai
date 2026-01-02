/**
 * Tasks Parser Tests
 *
 * Tests for parseTasksFile function to ensure it handles
 * various task file formats used in .yoyo-dev/specs/
 */

import { describe, it, expect } from 'vitest';
import { parseTasksFile } from '../lib/tasks-parser.js';

describe('parseTasksFile', () => {
  describe('Original Format (backward compatibility)', () => {
    it('should parse ## 1. Title format with - [ ] tasks', () => {
      const content = `# Tasks

## 1. Setup Project
- [ ] Initialize repository
- [x] Add dependencies
  - [x] Install TypeScript
  - [ ] Install Vitest

## 2. Implementation
- [ ] Create components
- [ ] Write tests
`;
      const groups = parseTasksFile(content);

      expect(groups).toHaveLength(2);
      expect(groups[0].id).toBe('1');
      expect(groups[0].title).toBe('Setup Project');
      expect(groups[0].tasks).toHaveLength(2);
      expect(groups[0].tasks[0].title).toBe('Initialize repository');
      expect(groups[0].tasks[0].status).toBe('pending');
      expect(groups[0].tasks[1].title).toBe('Add dependencies');
      expect(groups[0].tasks[1].status).toBe('completed');
      expect(groups[0].tasks[1].subtasks).toHaveLength(2);

      expect(groups[1].id).toBe('2');
      expect(groups[1].title).toBe('Implementation');
      expect(groups[1].tasks).toHaveLength(2);
    });
  });

  describe('Format A: Numbered with emphasis', () => {
    it('should parse ## 1. **Title** format', () => {
      const content = `# Spec Tasks

## 1. **Add description field to agent files**
- [ ] 1. Add to yoyo-ai.md
- [x] 2. Add to oracle.md
  - [x] 1.1 Update frontmatter
  - [ ] 1.2 Verify format

## 2. **Fix hook configuration**
- [ ] 1. Backup config
- [ ] 2. Update structure
`;
      const groups = parseTasksFile(content);

      expect(groups).toHaveLength(2);
      expect(groups[0].id).toBe('1');
      expect(groups[0].title).toBe('Add description field to agent files');
      expect(groups[0].tasks).toHaveLength(2);
      expect(groups[0].tasks[0].title).toBe('Add to yoyo-ai.md');
      expect(groups[0].tasks[1].title).toBe('Add to oracle.md');
      expect(groups[0].tasks[1].status).toBe('completed');
      expect(groups[0].tasks[1].subtasks).toHaveLength(2);

      expect(groups[1].id).toBe('2');
      expect(groups[1].title).toBe('Fix hook configuration');
    });

    it('should strip number prefixes from task titles', () => {
      const content = `## 1. Tasks
- [ ] 1. First task
- [ ] 2. Second task
- [x] 3. Third task
`;
      const groups = parseTasksFile(content);

      expect(groups[0].tasks[0].title).toBe('First task');
      expect(groups[0].tasks[1].title).toBe('Second task');
      expect(groups[0].tasks[2].title).toBe('Third task');
    });
  });

  describe('Format B: Named tasks with ### Task N:', () => {
    it('should parse ### Task N: Title format', () => {
      const content = `# Tasks: Feature Name

## Overview
Some description here.

### Task 1: Create Types
- [x] Define IntentType
- [x] Define ClassifierConfig
- [ ] Export types

### Task 2: Implement Classifier
- [ ] Create class
- [ ] Add tests
`;
      const groups = parseTasksFile(content);

      expect(groups).toHaveLength(2);
      expect(groups[0].id).toBe('1');
      expect(groups[0].title).toBe('Create Types');
      expect(groups[0].tasks).toHaveLength(3);

      expect(groups[1].id).toBe('2');
      expect(groups[1].title).toBe('Implement Classifier');
      expect(groups[1].tasks).toHaveLength(2);
    });
  });

  describe('Format C: Phase-based headers', () => {
    it('should parse ## Phase N: Title format', () => {
      const content = `# Implementation Tasks

## Phase 1: Core Infrastructure

### Task 1: Setup
- [x] Create directory
- [x] Add config

### Task 2: Types
- [ ] Define interfaces

## Phase 2: Features

### Task 3: API Routes
- [ ] Create endpoints
`;
      const groups = parseTasksFile(content);

      // Should find Task 1, Task 2, Task 3 as groups
      expect(groups).toHaveLength(3);
      expect(groups[0].title).toBe('Setup');
      expect(groups[1].title).toBe('Types');
      expect(groups[2].title).toBe('API Routes');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty content', () => {
      const groups = parseTasksFile('');
      expect(groups).toHaveLength(0);
    });

    it('should handle content with no tasks', () => {
      const content = `# README
Some documentation without tasks.
`;
      const groups = parseTasksFile(content);
      expect(groups).toHaveLength(0);
    });

    it('should handle tasks without group header', () => {
      const content = `# Tasks
- [ ] Standalone task 1
- [x] Standalone task 2
`;
      const groups = parseTasksFile(content);
      // Should create a default group for orphan tasks
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe('0');
      expect(groups[0].title).toBe('Tasks');
      expect(groups[0].tasks).toHaveLength(2);
    });

    it('should mark group as completed when all tasks are done', () => {
      const content = `## 1. Complete Group
- [x] Task 1
- [x] Task 2

## 2. Incomplete Group
- [x] Task 1
- [ ] Task 2
`;
      const groups = parseTasksFile(content);

      expect(groups[0].completed).toBe(true);
      expect(groups[1].completed).toBe(false);
    });

    it('should handle mixed checkbox formats [x] [X] [ ]', () => {
      const content = `## 1. Mixed
- [x] lowercase x
- [X] uppercase X
- [ ] space (pending)
`;
      const groups = parseTasksFile(content);

      expect(groups[0].tasks[0].status).toBe('completed');
      expect(groups[0].tasks[1].status).toBe('completed');
      expect(groups[0].tasks[2].status).toBe('pending');
    });

    it('should preserve subtask content accurately', () => {
      const content = `## 1. Group
- [ ] Main task
  - [ ] Subtask with **emphasis**
  - [x] Subtask with \`code\`
`;
      const groups = parseTasksFile(content);

      expect(groups[0].tasks[0].subtasks).toHaveLength(2);
      expect(groups[0].tasks[0].subtasks![0]).toBe('Subtask with **emphasis**');
      expect(groups[0].tasks[0].subtasks![1]).toBe('Subtask with `code`');
    });
  });

  describe('Real-world examples', () => {
    it('should parse orchestration-system-fix format', () => {
      const content = `# Spec Tasks

## Tasks

- [ ] 1. **Add description field to all orchestration agent files**
  - **Context:** Claude Code requires description field
  - [x] 1.1 Add description to yoyo-ai.md frontmatter
  - [x] 1.2 Add description to arthas-oracle.md frontmatter
  - [ ] 1.7 Verify all 6 agents appear

- [ ] 2. **Fix hook configuration structure**
  - [ ] 2.1 Backup current settings.json
  - [ ] 2.2 Flatten hook configuration
`;
      const groups = parseTasksFile(content);

      // Should create a default group since ## Tasks doesn't have a number
      expect(groups.length).toBeGreaterThanOrEqual(1);
      expect(groups[0].tasks.length).toBeGreaterThanOrEqual(2);
      expect(groups[0].tasks[0].title).toContain('Add description field');
    });

    it('should parse global-orchestration-mode format', () => {
      const content = `# Tasks: Global Orchestration Mode

## Phase 1: Core Infrastructure

### Task 1: Create Orchestration Types

**Purpose:** Define TypeScript types

**Subtasks:**
- [x] Define IntentType union type
- [x] Define IntentClassification interface
- [x] Export all types

### Task 2: Implement Intent Classifier

**Subtasks:**
- [x] Implement IntentClassifier class
- [x] Create default keyword lists
- [ ] Write unit tests
`;
      const groups = parseTasksFile(content);

      expect(groups.length).toBeGreaterThanOrEqual(2);
      expect(groups[0].title).toBe('Create Orchestration Types');
      expect(groups[0].tasks.length).toBeGreaterThanOrEqual(3);
    });
  });
});
