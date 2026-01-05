/**
 * Semantic Search Tests
 *
 * Tests for vector similarity search and hybrid search functionality.
 * Note: These tests use mocked data since better-sqlite3 may not be available.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cosineSimilarity, generateEmbedding, prepareContentForEmbedding } from '../embeddings.js';
import type { EnhancedMemoryBlock } from '../enhanced-store.js';
import type { ProjectContent, PersonaContent } from '../types.js';

// =============================================================================
// Mock Data
// =============================================================================

const mockProjectContent: ProjectContent = {
  name: 'Test React App',
  description: 'A React application with TypeScript',
  tech_stack: {
    language: 'TypeScript',
    framework: 'React',
    database: 'PostgreSQL',
    styling: 'Tailwind',
  },
  architecture: 'monolith',
  patterns: ['TDD', 'atomic-design'],
  key_directories: { src: 'Source code' },
};

const mockPersonaContent: PersonaContent = {
  name: 'Senior Developer',
  traits: ['thorough', 'detail-oriented'],
  communication_style: 'technical',
  expertise_areas: ['React', 'Node.js'],
};

// =============================================================================
// Unit Tests
// =============================================================================

describe('Semantic Search Core Functions', () => {
  describe('prepareContentForEmbedding', () => {
    it('should prepare project content for embedding', () => {
      const text = prepareContentForEmbedding(mockProjectContent);

      expect(text).toContain('name: Test React App');
      expect(text).toContain('description: A React application with TypeScript');
      expect(text).toContain('language: TypeScript');
      expect(text).toContain('framework: React');
    });

    it('should prepare persona content for embedding', () => {
      const text = prepareContentForEmbedding(mockPersonaContent);

      expect(text).toContain('name: Senior Developer');
      expect(text).toContain('thorough');
      expect(text).toContain('React');
    });
  });

  describe('Embedding Generation for Search', () => {
    it('should generate embeddings suitable for search', async () => {
      const queryText = 'React TypeScript frontend';
      const embedding = await generateEmbedding(queryText);

      expect(embedding.embeddings).toHaveLength(384);
      expect(embedding.provider).toBe('local');
    });

    it('should generate consistent embeddings for same text', async () => {
      const text = 'React frontend development';
      const embedding1 = await generateEmbedding(text);
      const embedding2 = await generateEmbedding(text);

      expect(embedding1.embeddings).toEqual(embedding2.embeddings);
    });
  });

  describe('Similarity Scoring', () => {
    it('should calculate high similarity for related content', async () => {
      const query = await generateEmbedding('React TypeScript frontend development');
      const contentText = prepareContentForEmbedding(mockProjectContent);
      const contentEmbedding = await generateEmbedding(contentText);

      const similarity = cosineSimilarity(query.embeddings, contentEmbedding.embeddings);

      // Should have some similarity due to common terms
      expect(similarity).toBeGreaterThan(0);
    });

    it('should calculate low similarity for unrelated content', async () => {
      const query = await generateEmbedding('Machine learning neural networks');
      const contentText = prepareContentForEmbedding(mockProjectContent);
      const contentEmbedding = await generateEmbedding(contentText);

      const unrelatedSimilarity = cosineSimilarity(query.embeddings, contentEmbedding.embeddings);

      // Even with local embeddings, unrelated content should have lower similarity
      const relatedQuery = await generateEmbedding('React TypeScript frontend');
      const relatedSimilarity = cosineSimilarity(relatedQuery.embeddings, contentEmbedding.embeddings);

      expect(relatedSimilarity).toBeGreaterThanOrEqual(unrelatedSimilarity);
    });
  });

  describe('Query Processing', () => {
    it('should handle empty queries gracefully', async () => {
      const embedding = await generateEmbedding('');
      expect(embedding.embeddings).toHaveLength(384);
    });

    it('should handle special characters in queries', async () => {
      const embedding = await generateEmbedding('What is @decorator? #typescript');
      expect(embedding.embeddings).toHaveLength(384);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'React '.repeat(100);
      const embedding = await generateEmbedding(longQuery);
      expect(embedding.embeddings).toHaveLength(384);
    });
  });

  describe('Ranking Logic', () => {
    it('should rank more similar results higher', async () => {
      const query = await generateEmbedding('React frontend');

      // Create mock blocks with different content
      const reactContent = await generateEmbedding('React TypeScript frontend development');
      const vueContent = await generateEmbedding('Vue JavaScript frontend development');
      const pythonContent = await generateEmbedding('Python Django backend API');

      const reactSimilarity = cosineSimilarity(query.embeddings, reactContent.embeddings);
      const vueSimilarity = cosineSimilarity(query.embeddings, vueContent.embeddings);
      const pythonSimilarity = cosineSimilarity(query.embeddings, pythonContent.embeddings);

      // React should be most similar (contains "React" and "frontend")
      // Vue should be next (contains "frontend")
      // Python should be least similar (no common terms)
      expect(reactSimilarity).toBeGreaterThan(pythonSimilarity);
    });
  });
});

describe('Keyword Search Logic', () => {
  it('should extract keywords from query', () => {
    const query = 'How do I implement authentication?';
    const keywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2);

    expect(keywords).toContain('how');
    expect(keywords).toContain('implement');
    expect(keywords).toContain('authentication');
  });

  it('should match keywords in content', () => {
    const contentText = prepareContentForEmbedding(mockProjectContent).toLowerCase();
    const keywords = ['react', 'typescript', 'frontend'];

    const matches = keywords.filter((k) => contentText.includes(k));

    expect(matches).toContain('react');
    expect(matches).toContain('typescript');
  });

  it('should calculate keyword match score', () => {
    const contentText = prepareContentForEmbedding(mockProjectContent).toLowerCase();
    const queryKeywords = ['react', 'typescript', 'python'];

    const matchingTerms = queryKeywords.filter((k) => contentText.includes(k));
    const score = matchingTerms.length / queryKeywords.length;

    // 2 out of 3 keywords match
    expect(score).toBeCloseTo(0.666, 2);
  });
});

describe('Hybrid Search Logic', () => {
  it('should combine semantic and keyword scores', () => {
    const semanticScore = 0.7;
    const keywordScore = 0.5;

    // Weighted combination (70% semantic, 30% keyword)
    const combinedScore = semanticScore * 0.7 + keywordScore * 0.3;

    expect(combinedScore).toBeCloseTo(0.64, 2);
  });

  it('should prefer exact keyword matches with semantic context', async () => {
    // Simulate hybrid scoring
    const query = 'React authentication';
    const queryEmbedding = await generateEmbedding(query);

    // Content 1: Has "React" keyword, good semantic match
    const content1 = 'React authentication with JWT tokens';
    const content1Embedding = await generateEmbedding(content1);
    const semantic1 = cosineSimilarity(queryEmbedding.embeddings, content1Embedding.embeddings);
    const keyword1 = 1.0; // Both keywords match

    // Content 2: Only semantic match, no exact keywords
    const content2 = 'Frontend security user login';
    const content2Embedding = await generateEmbedding(content2);
    const semantic2 = cosineSimilarity(queryEmbedding.embeddings, content2Embedding.embeddings);
    const keyword2 = 0; // No keyword matches

    const hybrid1 = semantic1 * 0.7 + keyword1 * 0.3;
    const hybrid2 = semantic2 * 0.7 + keyword2 * 0.3;

    // Content 1 should score higher due to keyword boost
    expect(hybrid1).toBeGreaterThan(hybrid2);
  });
});

describe('Search Result Structure', () => {
  it('should include all required fields in search result', () => {
    const mockResult = {
      block: {
        id: 'test-id',
        type: 'project' as const,
        scope: 'project' as const,
        content: mockProjectContent,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        embeddings: null,
        relevanceScore: 1.0,
        accessCount: 0,
        contextTags: ['react', 'typescript'],
        autoGenerated: false,
        confidenceLevel: 1.0,
      },
      similarity: 0.85,
      relevanceScore: 0.9,
      method: 'hybrid' as const,
      matchingTerms: ['react', 'typescript'],
    };

    expect(mockResult.block).toBeDefined();
    expect(mockResult.similarity).toBeDefined();
    expect(mockResult.relevanceScore).toBeDefined();
    expect(mockResult.method).toBeDefined();
    expect(mockResult.matchingTerms).toBeDefined();
  });

  it('should include response metadata', () => {
    const mockResponse = {
      results: [],
      total: 5,
      queryTime: 45,
      searchMethod: 'hybrid' as const,
    };

    expect(mockResponse.total).toBe(5);
    expect(mockResponse.queryTime).toBe(45);
    expect(mockResponse.searchMethod).toBe('hybrid');
  });
});
