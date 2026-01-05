/**
 * Embeddings Module Tests
 *
 * Tests for vector embedding generation and operations.
 */

import { describe, it, expect } from 'vitest';
import {
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
  euclideanDistance,
  normalizeVector,
  prepareContentForEmbedding,
  getDefaultConfig,
} from '../embeddings.js';

describe('Embeddings Module', () => {
  describe('generateEmbedding (local)', () => {
    it('should generate local embeddings', async () => {
      const result = await generateEmbedding('This is a test sentence');

      expect(result.provider).toBe('local');
      expect(result.model).toBe('local-tfidf');
      expect(result.embeddings).toHaveLength(384);
      expect(result.dimensions).toBe(384);
    });

    it('should generate different embeddings for different texts', async () => {
      const result1 = await generateEmbedding('React TypeScript frontend');
      const result2 = await generateEmbedding('Python Django backend');

      expect(result1.embeddings).not.toEqual(result2.embeddings);
    });

    it('should generate similar embeddings for similar texts', async () => {
      const result1 = await generateEmbedding('React JavaScript frontend development');
      const result2 = await generateEmbedding('React TypeScript frontend coding');

      const similarity = cosineSimilarity(result1.embeddings, result2.embeddings);
      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should respect custom dimensions', async () => {
      const result = await generateEmbedding('Test', { provider: 'local', dimensions: 128 });

      expect(result.embeddings).toHaveLength(128);
      expect(result.dimensions).toBe(128);
    });

    it('should normalize vectors to unit length', async () => {
      const result = await generateEmbedding('Test content for embedding');

      const magnitude = Math.sqrt(
        result.embeddings.reduce((sum, val) => sum + val * val, 0)
      );

      // Should be approximately 1.0 (unit vector)
      expect(magnitude).toBeCloseTo(1.0, 5);
    });
  });

  describe('generateEmbeddings (batch)', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = ['First text', 'Second text', 'Third text'];
      const results = await generateEmbeddings(texts);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.provider).toBe('local');
        expect(result.embeddings).toHaveLength(384);
      });
    });

    it('should handle empty array', async () => {
      const results = await generateEmbeddings([]);
      expect(results).toEqual([]);
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1.0 for identical vectors', () => {
      const vector = [0.5, 0.5, 0.5, 0.5];
      const similarity = cosineSimilarity(vector, vector);
      expect(similarity).toBeCloseTo(1.0, 10);
    });

    it('should return 0.0 for orthogonal vectors', () => {
      const v1 = [1, 0, 0];
      const v2 = [0, 1, 0];
      const similarity = cosineSimilarity(v1, v2);
      expect(similarity).toBeCloseTo(0.0, 10);
    });

    it('should return -1.0 for opposite vectors', () => {
      const v1 = [1, 0, 0];
      const v2 = [-1, 0, 0];
      const similarity = cosineSimilarity(v1, v2);
      expect(similarity).toBeCloseTo(-1.0, 10);
    });

    it('should throw for mismatched dimensions', () => {
      const v1 = [1, 2, 3];
      const v2 = [1, 2];
      expect(() => cosineSimilarity(v1, v2)).toThrow('Vector dimensions must match');
    });

    it('should handle zero vectors', () => {
      const v1 = [0, 0, 0];
      const v2 = [1, 2, 3];
      const similarity = cosineSimilarity(v1, v2);
      expect(similarity).toBe(0);
    });
  });

  describe('euclideanDistance', () => {
    it('should return 0.0 for identical vectors', () => {
      const vector = [1, 2, 3];
      const distance = euclideanDistance(vector, vector);
      expect(distance).toBe(0);
    });

    it('should calculate correct distance', () => {
      const v1 = [0, 0, 0];
      const v2 = [3, 4, 0];
      const distance = euclideanDistance(v1, v2);
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should throw for mismatched dimensions', () => {
      const v1 = [1, 2, 3];
      const v2 = [1, 2];
      expect(() => euclideanDistance(v1, v2)).toThrow('Vector dimensions must match');
    });
  });

  describe('normalizeVector', () => {
    it('should normalize to unit length', () => {
      const vector = [3, 4, 0]; // magnitude = 5
      const normalized = normalizeVector(vector);

      const magnitude = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1.0, 10);
      expect(normalized[0]).toBeCloseTo(0.6, 10);
      expect(normalized[1]).toBeCloseTo(0.8, 10);
    });

    it('should handle zero vector', () => {
      const vector = [0, 0, 0];
      const normalized = normalizeVector(vector);
      expect(normalized).toEqual([0, 0, 0]);
    });

    it('should preserve direction', () => {
      const vector = [1, 2, 3];
      const normalized = normalizeVector(vector);

      // Ratios should be preserved
      expect(normalized[1]! / normalized[0]!).toBeCloseTo(2, 10);
      expect(normalized[2]! / normalized[0]!).toBeCloseTo(3, 10);
    });
  });

  describe('prepareContentForEmbedding', () => {
    it('should handle string content', () => {
      const text = prepareContentForEmbedding('Simple text');
      expect(text).toBe('Simple text');
    });

    it('should flatten object content', () => {
      const content = {
        name: 'Project',
        description: 'A test project',
        tags: ['react', 'typescript'],
      };

      const text = prepareContentForEmbedding(content);

      expect(text).toContain('name: Project');
      expect(text).toContain('description: A test project');
      expect(text).toContain('react');
      expect(text).toContain('typescript');
    });

    it('should handle nested objects', () => {
      const content = {
        tech_stack: {
          language: 'TypeScript',
          framework: 'React',
        },
      };

      const text = prepareContentForEmbedding(content);

      expect(text).toContain('language: TypeScript');
      expect(text).toContain('framework: React');
    });

    it('should handle null and undefined', () => {
      expect(prepareContentForEmbedding(null)).toBe('null');
      expect(prepareContentForEmbedding(undefined)).toBe('undefined');
    });

    it('should handle arrays', () => {
      const content = ['item1', 'item2', 'item3'];
      const text = prepareContentForEmbedding(content);

      expect(text).toContain('item1');
      expect(text).toContain('item2');
      expect(text).toContain('item3');
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const config = getDefaultConfig();

      expect(config.provider).toBe('local');
      expect(config.dimensions).toBe(384);
    });
  });

  describe('Semantic Similarity', () => {
    it('should find texts with common terms more similar', async () => {
      // Use texts with overlapping terms for the local TF-IDF approach
      const techText1 = await generateEmbedding('React TypeScript frontend development web');
      const techText2 = await generateEmbedding('React JavaScript frontend development app');
      const nonTechText = await generateEmbedding('Cooking recipes kitchen food meal');

      const techSimilarity = cosineSimilarity(techText1.embeddings, techText2.embeddings);
      const mixedSimilarity = cosineSimilarity(techText1.embeddings, nonTechText.embeddings);

      // With common terms like "React", "frontend", "development", tech texts should be more similar
      expect(techSimilarity).toBeGreaterThan(mixedSimilarity);
    });

    it('should produce higher similarity for duplicate texts', async () => {
      const text1 = await generateEmbedding('React development frontend');
      const text2 = await generateEmbedding('React development frontend');

      const similarity = cosineSimilarity(text1.embeddings, text2.embeddings);
      expect(similarity).toBeCloseTo(1.0, 5);
    });
  });
});
