/**
 * Performance Tests for Global Orchestration Mode
 * @version 6.2.0
 * @description Performance benchmarks for intent classification (<10ms target)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntentClassifier } from '../intent-classifier';
import { OrchestrationRouter } from '../router';
import { OutputFormatter } from '../output-formatter';

describe('Performance Benchmarks', () => {
  describe('Intent Classifier Performance', () => {
    let classifier: IntentClassifier;

    beforeEach(() => {
      classifier = new IntentClassifier();
    });

    it('should classify single input within 50ms', () => {
      const start = performance.now();
      classifier.classify('how to implement authentication with best practices');
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it('should classify 100 inputs within 300ms', () => {
      const inputs = [
        'how to implement auth',
        'fix the bug in login',
        'where is the auth file',
        'style the button with tailwind',
        'document the API',
        'plan the feature',
        'build the notification system',
        'find all uses of useEffect',
        'error in production',
        'create a new component',
      ];

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        classifier.classify(inputs[i % inputs.length]);
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(300);
      console.log(`100 classifications: ${elapsed.toFixed(2)}ms (${(elapsed / 100).toFixed(3)}ms avg)`);
    });

    it('should classify 1000 inputs within 1500ms', () => {
      const inputs = [
        'how to implement auth',
        'fix the bug in login',
        'where is the auth file',
        'style the button',
        'document the API',
      ];

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        classifier.classify(inputs[i % inputs.length]);
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(1500);
      console.log(`1000 classifications: ${elapsed.toFixed(2)}ms (${(elapsed / 1000).toFixed(3)}ms avg)`);
    });

    it('should handle very long inputs within 50ms', () => {
      const longInput = 'how to implement authentication with best practices and documentation '.repeat(100);

      const start = performance.now();
      classifier.classify(longInput);
      const elapsed = performance.now() - start;

      // Long inputs may take slightly longer, allow up to 50ms on shared runners
      expect(elapsed).toBeLessThan(50);
      console.log(`Long input (${longInput.length} chars): ${elapsed.toFixed(2)}ms`);
    });

    it('should handle many keywords efficiently', () => {
      // Input with many potential keyword matches
      const manyKeywords =
        'how to find and fix the bug with best practice documentation for implementing the layout component with styling and error handling';

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        classifier.classify(manyKeywords);
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(200);
      console.log(`100 many-keyword classifications: ${elapsed.toFixed(2)}ms`);
    });

    it('should have consistent performance across intent types', () => {
      const intentExamples: Record<string, string> = {
        research: 'how to implement authentication',
        codebase: 'where is the login code',
        frontend: 'style the button with tailwind',
        debug: 'fix the authentication error',
        documentation: 'document the API endpoints',
        planning: 'plan the feature architecture',
        implementation: 'implement the user profile',
        general: 'hello world',
      };

      const timings: Record<string, number> = {};

      for (const [intent, input] of Object.entries(intentExamples)) {
        const start = performance.now();
        for (let i = 0; i < 100; i++) {
          classifier.classify(input);
        }
        timings[intent] = (performance.now() - start) / 100;
      }

      // All intent types should have similar performance
      const values = Object.values(timings);
      const max = Math.max(...values);
      const min = Math.min(...values);

      console.log('Average classification time per intent type:');
      for (const [intent, time] of Object.entries(timings)) {
        console.log(`  ${intent}: ${time.toFixed(3)}ms`);
      }

      // Max should not be more than 20x min (allowing for CI variance)
      expect(max / min).toBeLessThan(20);
    });
  });

  describe('Full Pipeline Performance', () => {
    let classifier: IntentClassifier;
    let router: OrchestrationRouter;
    let formatter: OutputFormatter;

    beforeEach(() => {
      classifier = new IntentClassifier();
      router = new OrchestrationRouter();
      formatter = new OutputFormatter({ showPrefixes: true });
    });

    it('should complete full pipeline within 10ms', () => {
      const input = 'how to implement authentication';

      const start = performance.now();
      const classification = classifier.classify(input);
      const routing = router.route(classification, input);
      const output = formatter.format('alma-librarian', 'Research complete');
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
      expect(classification).toBeDefined();
      expect(routing).toBeDefined();
      expect(output).toBeDefined();
    });

    it('should complete 100 full pipelines within 200ms', () => {
      const inputs = [
        'how to implement auth',
        'fix the bug',
        'where is the code',
        'style the button',
        'document this',
      ];

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        const input = inputs[i % inputs.length];
        const classification = classifier.classify(input);
        const routing = router.route(classification, input);
        if (classification.shouldOrchestrate) {
          formatter.format(classification.primaryAgent!, 'Output message');
        }
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(200);
      console.log(`100 full pipelines: ${elapsed.toFixed(2)}ms (${(elapsed / 100).toFixed(3)}ms avg)`);
    });
  });

  describe('Router Performance', () => {
    let router: OrchestrationRouter;
    let classifier: IntentClassifier;

    beforeEach(() => {
      router = new OrchestrationRouter();
      classifier = new IntentClassifier();
    });

    it('should route 1000 classifications within 100ms', () => {
      const classification = classifier.classify('where is the login code');

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        router.route(classification, 'where is the login code');
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      console.log(`1000 routings: ${elapsed.toFixed(2)}ms (${(elapsed / 1000).toFixed(3)}ms avg)`);
    });
  });

  describe('Formatter Performance', () => {
    let formatter: OutputFormatter;

    beforeEach(() => {
      formatter = new OutputFormatter({ showPrefixes: true });
    });

    it('should format 1000 messages within 50ms', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        formatter.format('yoyo-ai', 'This is a test message for formatting');
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
      console.log(`1000 format calls: ${elapsed.toFixed(2)}ms`);
    });

    it('should format complex messages efficiently', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        formatter.formatTransition('yoyo-ai', 'dave-engineer', 'Frontend work detected');
        formatter.formatError('yoyo-ai', 'Build failed', 1, 3);
        formatter.formatBackgroundComplete('alma-librarian', 'Research complete');
        formatter.formatEscalation('yoyo-ai', 'arthas-oracle', 'Multiple failures');
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      console.log(`400 complex format calls: ${elapsed.toFixed(2)}ms`);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory during repeated classifications', () => {
      const classifier = new IntentClassifier();
      const inputs = Array.from({ length: 100 }, (_, i) => `how to implement feature ${i}`);

      // Warm up
      for (let i = 0; i < 100; i++) {
        classifier.classify(inputs[i % inputs.length]);
      }

      // Get baseline memory if available (Node.js only)
      const initialMemory = typeof process !== 'undefined' ? process.memoryUsage().heapUsed : 0;

      // Run many classifications
      for (let i = 0; i < 10000; i++) {
        classifier.classify(inputs[i % inputs.length]);
      }

      const finalMemory = typeof process !== 'undefined' ? process.memoryUsage().heapUsed : 0;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be minimal (less than 10MB)
      if (typeof process !== 'undefined') {
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
        console.log(`Memory growth after 10000 classifications: ${(memoryGrowth / 1024).toFixed(2)} KB`);
      }
    });
  });

  describe('Latency Distribution', () => {
    it('should have consistent latency (low variance)', () => {
      const classifier = new IntentClassifier();
      const input = 'how to implement authentication';
      const iterations = 100;
      const latencies: number[] = [];

      // Warm up
      for (let i = 0; i < 10; i++) {
        classifier.classify(input);
      }

      // Collect latencies
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        classifier.classify(input);
        latencies.push(performance.now() - start);
      }

      // Calculate statistics
      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const variance =
        latencies.reduce((sum, lat) => sum + Math.pow(lat - avg, 2), 0) / latencies.length;
      const stdDev = Math.sqrt(variance);
      const p95 = latencies.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];
      const p99 = latencies.sort((a, b) => a - b)[Math.floor(iterations * 0.99)];

      console.log('Latency distribution:');
      console.log(`  Average: ${avg.toFixed(3)}ms`);
      console.log(`  Std Dev: ${stdDev.toFixed(3)}ms`);
      console.log(`  P95: ${p95.toFixed(3)}ms`);
      console.log(`  P99: ${p99.toFixed(3)}ms`);

      // P99 should be under 10ms
      expect(p99).toBeLessThan(10);

      // Standard deviation should be reasonable; allow more headroom on busy hosts
      expect(stdDev).toBeLessThan(Math.max(avg * 10, 5));
    });
  });
});
