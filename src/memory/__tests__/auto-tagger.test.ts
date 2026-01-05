/**
 * Auto-Tagger Tests
 *
 * Tests for automatic tag extraction from memory content.
 */

import { describe, it, expect } from 'vitest';
import {
  extractTags,
  suggestTags,
  mergeTags,
  filterTagsByCategory,
} from '../auto-tagger.js';
import type { ProjectContent, PersonaContent, UserContent } from '../types.js';

describe('Auto-Tagger', () => {
  describe('extractTags', () => {
    it('should extract tags from project content', () => {
      const content: ProjectContent = {
        name: 'My React App',
        description: 'A React application with TypeScript',
        tech_stack: {
          language: 'TypeScript',
          framework: 'React',
          database: 'PostgreSQL',
          styling: 'Tailwind',
        },
        architecture: 'monolith',
        patterns: ['TDD', 'atomic-design'],
        key_directories: {
          src: 'Source code',
          tests: 'Test files',
        },
      };

      const result = extractTags('project', content);

      expect(result.tags).toContain('project');
      expect(result.tags).toContain('typescript');
      expect(result.tags).toContain('react');
      expect(result.tags).toContain('postgresql');
      expect(result.tags).toContain('tailwind');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should extract tags from persona content', () => {
      const content: PersonaContent = {
        name: 'Senior Developer',
        traits: ['thorough', 'detail-oriented'],
        communication_style: 'technical',
        expertise_areas: ['React', 'Node.js', 'Database Design'],
      };

      const result = extractTags('persona', content);

      expect(result.tags).toContain('persona');
      expect(result.tags).toContain('react');
      expect(result.tags).toContain('node.js');
      expect(result.tags).toContain('database-design');
    });

    it('should detect technology keywords from content', () => {
      const content: ProjectContent = {
        name: 'API Service',
        description: 'A RESTful API with authentication and validation',
        tech_stack: { language: 'Python', framework: 'FastAPI' },
        architecture: 'microservices',
        patterns: [],
        key_directories: {},
      };

      const result = extractTags('project', content);

      expect(result.tags).toContain('api');
      expect(result.tags).toContain('authentication');
      expect(result.tags).toContain('validation');
      expect(result.tags).toContain('python');
    });

    it('should include block type as tag', () => {
      const content: UserContent = {
        coding_style: ['functional'],
        preferences: {},
        tools: ['vim'],
        communication: { verbosity: 'minimal', examples: true, explanations: false },
      };

      const result = extractTags('user', content);

      expect(result.tags).toContain('user');
    });
  });

  describe('suggestTags', () => {
    it('should suggest tags from free-form text', () => {
      const text = `
        I prefer using TypeScript with React for frontend development.
        The codebase uses Tailwind CSS for styling and Jest for testing.
        We follow TDD practices and have good error handling.
      `;

      const result = suggestTags(text);

      expect(result.tags).toContain('typescript');
      expect(result.tags).toContain('react');
      expect(result.tags).toContain('tailwind');
      expect(result.tags).toContain('testing');
      expect(result.tags).toContain('error-handling');
    });

    it('should handle empty text', () => {
      const result = suggestTags('');
      expect(result.tags).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should detect backend technologies', () => {
      const text = 'Using Express.js with PostgreSQL database and Redis for caching';

      const result = suggestTags(text);

      expect(result.tags).toContain('express');
      expect(result.tags).toContain('postgresql');
      expect(result.tags).toContain('redis');
    });

    it('should detect DevOps keywords', () => {
      const text = 'Deployment via Docker containers with Kubernetes orchestration';

      const result = suggestTags(text);

      expect(result.tags).toContain('docker');
      expect(result.tags).toContain('kubernetes');
    });
  });

  describe('mergeTags', () => {
    it('should merge multiple tag arrays', () => {
      const tags1 = ['react', 'typescript'];
      const tags2 = ['tailwind', 'testing'];
      const tags3 = ['react', 'api']; // Duplicate 'react'

      const merged = mergeTags(tags1, tags2, tags3);

      expect(merged).toContain('react');
      expect(merged).toContain('typescript');
      expect(merged).toContain('tailwind');
      expect(merged).toContain('testing');
      expect(merged).toContain('api');
      expect(merged.filter((t) => t === 'react').length).toBe(1); // No duplicates
    });

    it('should handle empty arrays', () => {
      const merged = mergeTags([], ['tag1'], []);
      expect(merged).toEqual(['tag1']);
    });

    it('should normalize tags to lowercase', () => {
      const merged = mergeTags(['React', 'TypeScript'], ['TAILWIND']);
      expect(merged).toContain('react');
      expect(merged).toContain('typescript');
      expect(merged).toContain('tailwind');
      expect(merged).not.toContain('React');
    });

    it('should sort merged tags', () => {
      const merged = mergeTags(['zebra', 'apple'], ['banana']);
      expect(merged).toEqual(['apple', 'banana', 'zebra']);
    });
  });

  describe('filterTagsByCategory', () => {
    it('should filter tech tags only', () => {
      const tags = ['react', 'typescript', 'authentication', 'error-handling', 'docker'];

      const techTags = filterTagsByCategory(tags, 'tech');

      expect(techTags).toContain('react');
      expect(techTags).toContain('typescript');
      expect(techTags).toContain('docker');
      expect(techTags).not.toContain('authentication');
      expect(techTags).not.toContain('error-handling');
    });

    it('should filter content tags only', () => {
      const tags = ['react', 'authentication', 'validation', 'performance', 'typescript'];

      const contentTags = filterTagsByCategory(tags, 'content');

      expect(contentTags).toContain('authentication');
      expect(contentTags).toContain('validation');
      expect(contentTags).toContain('performance');
      expect(contentTags).not.toContain('react');
      expect(contentTags).not.toContain('typescript');
    });

    it('should return all tags when category is all', () => {
      const tags = ['react', 'authentication', 'docker'];

      const allTags = filterTagsByCategory(tags, 'all');

      expect(allTags).toEqual(tags);
    });
  });
});
