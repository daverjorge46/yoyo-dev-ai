/**
 * Multi-Modal Memory Tests
 *
 * Tests for attachments, code snippets, and visual memory.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// =============================================================================
// Attachment Tests
// =============================================================================

import {
  AttachmentManager,
  createAttachmentManager,
  type AttachmentType,
} from '../attachments.js';

describe('Attachment Manager', () => {
  let manager: AttachmentManager;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'attach-test-'));
    manager = createAttachmentManager({
      storageDir: path.join(tempDir, 'attachments'),
      maxFileSizeBytes: 1024 * 1024, // 1MB
      maxTotalStorageBytes: 10 * 1024 * 1024, // 10MB
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Add Attachment', () => {
    it('should add a text attachment from string', async () => {
      const result = await manager.addAttachment({
        source: 'Hello, World!',
        filename: 'test.txt',
      });

      expect(result.id).toBeDefined();
      expect(result.filename).toBe('test.txt');
      expect(result.mimeType).toBe('text/plain');
      expect(result.sizeBytes).toBe(13);
      expect(result.type).toBe('code');
    });

    it('should add a JSON attachment', async () => {
      const json = JSON.stringify({ key: 'value' });
      const result = await manager.addAttachment({
        source: json,
        filename: 'config.json',
        description: 'Configuration file',
      });

      expect(result.mimeType).toBe('application/json');
      expect(result.type).toBe('code');
      expect(result.description).toBe('Configuration file');
    });

    it('should add attachment from buffer', async () => {
      const buffer = Buffer.from('Binary content', 'utf-8');
      const result = await manager.addAttachment({
        source: buffer,
        filename: 'data.bin',
      });

      expect(result.sizeBytes).toBe(buffer.length);
    });

    it('should add attachment from file', async () => {
      const filePath = path.join(tempDir, 'source.txt');
      fs.writeFileSync(filePath, 'File content');

      const result = await manager.addAttachment({
        source: filePath,
        filename: 'source.txt',
      });

      expect(result.sizeBytes).toBe(12);
    });

    it('should reject oversized files', async () => {
      const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB

      await expect(manager.addAttachment({
        source: largeContent,
        filename: 'large.txt',
      })).rejects.toThrow('exceeds maximum');
    });

    it('should include tags', async () => {
      const result = await manager.addAttachment({
        source: 'content',
        filename: 'test.txt',
        tags: ['config', 'important'],
      });

      expect(result.tags).toContain('config');
      expect(result.tags).toContain('important');
    });
  });

  describe('Get Attachment', () => {
    it('should retrieve attachment metadata', async () => {
      const added = await manager.addAttachment({
        source: 'test',
        filename: 'test.txt',
      });

      const retrieved = manager.getAttachment(added.id);
      expect(retrieved?.filename).toBe('test.txt');
    });

    it('should retrieve attachment data', async () => {
      const content = 'Test content';
      const added = await manager.addAttachment({
        source: content,
        filename: 'test.txt',
      });

      const data = manager.getAttachmentData(added.id);
      expect(data?.toString()).toBe(content);
    });

    it('should return undefined for unknown attachment', () => {
      expect(manager.getAttachment('unknown')).toBeUndefined();
      expect(manager.getAttachmentData('unknown')).toBeNull();
    });
  });

  describe('Delete Attachment', () => {
    it('should delete an attachment', async () => {
      const added = await manager.addAttachment({
        source: 'test',
        filename: 'test.txt',
      });

      expect(manager.deleteAttachment(added.id)).toBe(true);
      expect(manager.getAttachment(added.id)).toBeUndefined();
    });

    it('should return false for unknown attachment', () => {
      expect(manager.deleteAttachment('unknown')).toBe(false);
    });
  });

  describe('List and Search', () => {
    beforeEach(async () => {
      await manager.addAttachment({ source: 'js code', filename: 'app.js', tags: ['code'] });
      await manager.addAttachment({ source: 'css styles', filename: 'styles.css', tags: ['styles'] });
      await manager.addAttachment({ source: '{}', filename: 'data.json', tags: ['code', 'config'] });
    });

    it('should list all attachments', () => {
      const list = manager.listAttachments();
      expect(list.length).toBe(3);
    });

    it('should filter by type', () => {
      const list = manager.listAttachments({ type: 'code' });
      expect(list.every((a) => a.type === 'code')).toBe(true);
    });

    it('should filter by tags', () => {
      const list = manager.listAttachments({ tags: ['code'] });
      expect(list.length).toBe(2);
    });

    it('should search by filename', () => {
      const results = manager.searchAttachments('app');
      expect(results.length).toBe(1);
      expect(results[0]?.filename).toBe('app.js');
    });

    it('should search by description', async () => {
      await manager.addAttachment({
        source: 'test',
        filename: 'important.txt',
        description: 'Very important configuration',
      });

      const results = manager.searchAttachments('important');
      expect(results.length).toBe(1);
    });
  });

  describe('Update and Verify', () => {
    it('should update metadata', async () => {
      const added = await manager.addAttachment({
        source: 'test',
        filename: 'test.txt',
      });

      manager.updateAttachment(added.id, {
        description: 'Updated description',
        tags: ['new-tag'],
      });

      const updated = manager.getAttachment(added.id);
      expect(updated?.description).toBe('Updated description');
      expect(updated?.tags).toContain('new-tag');
    });

    it('should verify integrity', async () => {
      const added = await manager.addAttachment({
        source: 'test content',
        filename: 'test.txt',
      });

      const result = manager.verifyIntegrity(added.id);
      expect(result.valid).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should calculate stats', async () => {
      await manager.addAttachment({ source: 'code', filename: 'app.js' });
      await manager.addAttachment({ source: 'data', filename: 'image.png' });

      const stats = manager.getStats();
      expect(stats.totalAttachments).toBe(2);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Code Snippets Tests
// =============================================================================

import {
  SnippetManager,
  createSnippetManager,
  type Language,
} from '../code-snippets.js';

describe('Snippet Manager', () => {
  let manager: SnippetManager;

  beforeEach(() => {
    manager = createSnippetManager();
  });

  describe('Add Snippet', () => {
    it('should add a code snippet', () => {
      const snippet = manager.addSnippet({
        title: 'Hello World',
        code: 'console.log("Hello!");',
        language: 'javascript',
      });

      expect(snippet.id).toBeDefined();
      expect(snippet.title).toBe('Hello World');
      expect(snippet.language).toBe('javascript');
      expect(snippet.accessCount).toBe(0);
    });

    it('should auto-detect language', () => {
      const snippet = manager.addSnippet({
        title: 'TypeScript Code',
        code: 'const x: number = 5;',
      });

      expect(snippet.language).toBe('typescript');
    });

    it('should detect Python', () => {
      const snippet = manager.addSnippet({
        title: 'Python Code',
        code: 'def hello():\n    print("Hello")',
      });

      expect(snippet.language).toBe('python');
    });

    it('should detect SQL', () => {
      const snippet = manager.addSnippet({
        title: 'SQL Query',
        code: 'SELECT * FROM users WHERE id = 1',
      });

      expect(snippet.language).toBe('sql');
    });

    it('should detect JSON', () => {
      const snippet = manager.addSnippet({
        title: 'Config',
        code: '{"name": "test", "value": 123}',
      });

      expect(snippet.language).toBe('json');
    });

    it('should include tags', () => {
      const snippet = manager.addSnippet({
        title: 'Tagged',
        code: 'code',
        tags: ['utility', 'helper'],
      });

      expect(snippet.tags).toContain('utility');
    });

    it('should reject oversized code', () => {
      const largeCode = 'x'.repeat(60000);

      expect(() => manager.addSnippet({
        title: 'Large',
        code: largeCode,
      })).toThrow('exceeds maximum');
    });
  });

  describe('Get and Update Snippet', () => {
    it('should get snippet and increment access count', () => {
      const added = manager.addSnippet({
        title: 'Test',
        code: 'test code',
      });

      const retrieved = manager.getSnippet(added.id);
      expect(retrieved?.accessCount).toBe(1);

      manager.getSnippet(added.id);
      expect(manager.getSnippet(added.id)?.accessCount).toBe(3);
    });

    it('should update snippet', () => {
      const added = manager.addSnippet({
        title: 'Original',
        code: 'original code',
      });

      manager.updateSnippet(added.id, {
        title: 'Updated',
        code: 'updated code',
      });

      const updated = manager.getSnippet(added.id);
      expect(updated?.title).toBe('Updated');
      expect(updated?.code).toBe('updated code');
    });
  });

  describe('Delete Snippet', () => {
    it('should delete a snippet', () => {
      const added = manager.addSnippet({
        title: 'Test',
        code: 'code',
      });

      expect(manager.deleteSnippet(added.id)).toBe(true);
      expect(manager.getSnippet(added.id)).toBeUndefined();
    });
  });

  describe('List and Search', () => {
    beforeEach(() => {
      manager.addSnippet({ title: 'JS Function', code: 'function test() {}', language: 'javascript' });
      manager.addSnippet({ title: 'TS Class', code: 'class Test {}', language: 'typescript' });
      manager.addSnippet({ title: 'Python Script', code: 'def test(): pass', language: 'python' });
    });

    it('should list all snippets', () => {
      const list = manager.listSnippets();
      expect(list.length).toBe(3);
    });

    it('should filter by language', () => {
      const list = manager.listSnippets({ language: 'typescript' });
      expect(list.length).toBe(1);
      expect(list[0]?.title).toBe('TS Class');
    });

    it('should get by language', () => {
      const jsSnippets = manager.getByLanguage('javascript');
      expect(jsSnippets.length).toBe(1);
    });

    it('should search by title', () => {
      const results = manager.searchSnippets('Function');
      expect(results.length).toBe(1);
    });

    it('should search by code content', () => {
      const results = manager.searchSnippets('def test');
      expect(results.length).toBe(1);
      expect(results[0]?.language).toBe('python');
    });
  });

  describe('Language Detection', () => {
    it('should detect from file extension', () => {
      const lang = manager.detectLanguage('', 'component.tsx');
      expect(lang).toBe('typescript');
    });

    it('should detect Go', () => {
      const lang = manager.detectLanguage('package main\n\nfunc main() {}');
      expect(lang).toBe('go');
    });

    it('should detect Rust', () => {
      const lang = manager.detectLanguage('fn main() {\n    let mut x = 5;\n}');
      expect(lang).toBe('rust');
    });

    it('should detect HTML', () => {
      const lang = manager.detectLanguage('<!DOCTYPE html>\n<html></html>');
      expect(lang).toBe('html');
    });

    it('should return unknown for unrecognized code', () => {
      const lang = manager.detectLanguage('random text here');
      expect(lang).toBe('unknown');
    });
  });

  describe('Statistics', () => {
    it('should calculate stats', () => {
      manager.addSnippet({ title: 'A', code: 'code a', language: 'javascript' });
      manager.addSnippet({ title: 'B', code: 'longer code here', language: 'javascript' });
      manager.addSnippet({ title: 'C', code: 'py', language: 'python' });

      const stats = manager.getStats();
      expect(stats.total).toBe(3);
      expect(stats.byLanguage['javascript']).toBe(2);
      expect(stats.byLanguage['python']).toBe(1);
      expect(stats.totalCodeLength).toBeGreaterThan(0);
    });
  });

  describe('Export/Import', () => {
    it('should export and import snippets', () => {
      manager.addSnippet({ title: 'Test', code: 'code' });
      const exported = manager.export();

      manager.clear();
      expect(manager.listSnippets().length).toBe(0);

      const imported = manager.import(exported);
      expect(imported).toBe(1);
      expect(manager.listSnippets().length).toBe(1);
    });
  });
});

// =============================================================================
// Visual Memory Tests
// =============================================================================

import {
  VisualMemoryManager,
  createVisualMemoryManager,
  type VisualType,
} from '../visual-memory.js';

describe('Visual Memory Manager', () => {
  let manager: VisualMemoryManager;

  beforeEach(() => {
    manager = createVisualMemoryManager();
  });

  describe('Add Visual', () => {
    it('should add a visual memory', () => {
      const visual = manager.addVisual({
        source: '/path/to/image.png',
        title: 'Screenshot',
      });

      expect(visual.id).toBeDefined();
      expect(visual.title).toBe('Screenshot');
      expect(visual.format).toBe('png');
      expect(visual.type).toBe('screenshot');
    });

    it('should detect diagram type', () => {
      const visual = manager.addVisual({
        source: '/path/to/architecture-diagram.png',
        title: 'System Architecture',
      });

      expect(visual.type).toBe('diagram');
    });

    it('should detect mockup type', () => {
      const visual = manager.addVisual({
        source: '/path/to/mockup.png',
        title: 'UI Wireframe',
      });

      expect(visual.type).toBe('mockup');
    });

    it('should detect URL source', () => {
      const visual = manager.addVisual({
        source: 'https://example.com/image.jpg',
        title: 'Remote Image',
      });

      expect(visual.isUrl).toBe(true);
    });

    it('should include related entities', () => {
      const visual = manager.addVisual({
        source: '/path/to/image.png',
        title: 'Component Screenshot',
        relatedEntities: ['src/components/Header.tsx', 'Header component'],
      });

      expect(visual.relatedEntities).toContain('src/components/Header.tsx');
    });
  });

  describe('Get and Update Visual', () => {
    it('should get visual and increment access', () => {
      const added = manager.addVisual({
        source: '/path/to/image.png',
        title: 'Test',
      });

      const retrieved = manager.getVisual(added.id);
      expect(retrieved?.accessCount).toBe(1);
    });

    it('should update visual metadata', () => {
      const added = manager.addVisual({
        source: '/path/to/image.png',
        title: 'Original',
      });

      manager.updateVisual(added.id, {
        title: 'Updated',
        description: 'New description',
        tags: ['new-tag'],
      });

      const updated = manager.getVisual(added.id);
      expect(updated?.title).toBe('Updated');
      expect(updated?.description).toBe('New description');
    });
  });

  describe('Annotations', () => {
    it('should add annotation', () => {
      const visual = manager.addVisual({
        source: '/path/to/image.png',
        title: 'Test',
      });

      const annotation = manager.addAnnotation(visual.id, {
        type: 'text',
        position: { x: 50, y: 50 },
        content: 'This is a button',
      });

      expect(annotation?.id).toBeDefined();
      expect(manager.getVisual(visual.id)?.annotations.length).toBe(1);
    });

    it('should remove annotation', () => {
      const visual = manager.addVisual({
        source: '/path/to/image.png',
        title: 'Test',
      });

      const annotation = manager.addAnnotation(visual.id, {
        type: 'highlight',
        position: { x: 10, y: 10, width: 100, height: 50 },
        content: 'Important',
        color: '#ff0000',
      });

      expect(manager.removeAnnotation(visual.id, annotation!.id)).toBe(true);
      expect(manager.getVisual(visual.id)?.annotations.length).toBe(0);
    });
  });

  describe('OCR', () => {
    it('should set OCR text', () => {
      const visual = manager.addVisual({
        source: '/path/to/image.png',
        title: 'Screenshot with text',
      });

      manager.setOcrText(visual.id, 'Login\nPassword\nSubmit');

      expect(manager.getVisual(visual.id)?.ocrText).toBe('Login\nPassword\nSubmit');
    });

    it('should search by OCR text', () => {
      const visual = manager.addVisual({
        source: '/path/to/image.png',
        title: 'Form',
      });
      manager.setOcrText(visual.id, 'Username Password Login');

      const results = manager.searchVisuals('Password');
      expect(results.length).toBe(1);
    });
  });

  describe('List and Search', () => {
    beforeEach(() => {
      manager.addVisual({
        source: '/path/to/screenshot1.png',
        title: 'Dashboard Screenshot',
        tags: ['ui'],
      });
      manager.addVisual({
        source: '/path/to/diagram.svg',
        title: 'Architecture Diagram',
        tags: ['architecture'],
      });
      manager.addVisual({
        source: '/path/to/mockup.png',
        title: 'Login Mockup',
        tags: ['ui', 'auth'],
      });
    });

    it('should list all visuals', () => {
      const list = manager.listVisuals();
      expect(list.length).toBe(3);
    });

    it('should filter by type', () => {
      const screenshots = manager.listVisuals({ type: 'screenshot' });
      expect(screenshots.length).toBe(1);
    });

    it('should filter by format', () => {
      const svgs = manager.listVisuals({ format: 'svg' });
      expect(svgs.length).toBe(1);
    });

    it('should filter by tags', () => {
      const uiVisuals = manager.listVisuals({ tags: ['ui'] });
      expect(uiVisuals.length).toBe(2);
    });

    it('should search by title', () => {
      const results = manager.searchVisuals('Dashboard');
      expect(results.length).toBe(1);
    });

    it('should get screenshots only', () => {
      const screenshots = manager.getScreenshots();
      expect(screenshots.length).toBe(1);
    });

    it('should get diagrams only', () => {
      const diagrams = manager.getDiagrams();
      expect(diagrams.length).toBe(1);
    });
  });

  describe('Related Entities', () => {
    it('should find by related entity', () => {
      manager.addVisual({
        source: '/path/to/image.png',
        title: 'Header Component',
        relatedEntities: ['src/components/Header.tsx'],
      });
      manager.addVisual({
        source: '/path/to/other.png',
        title: 'Other',
      });

      const results = manager.findByRelatedEntity('Header');
      expect(results.length).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should calculate stats', () => {
      manager.addVisual({ source: '/a.png', title: 'A' });
      manager.addVisual({ source: '/b.jpg', title: 'B' });
      const v = manager.addVisual({ source: '/c.svg', title: 'C' });
      manager.addAnnotation(v.id, { type: 'text', position: { x: 0, y: 0 }, content: 'Note' });
      manager.setOcrText(v.id, 'Text');

      const stats = manager.getStats();
      expect(stats.total).toBe(3);
      expect(stats.byFormat['png']).toBe(1);
      expect(stats.byFormat['jpg']).toBe(1);
      expect(stats.byFormat['svg']).toBe(1);
      expect(stats.totalAnnotations).toBe(1);
      expect(stats.withOcr).toBe(1);
    });
  });

  describe('Export/Import', () => {
    it('should export and import visuals', () => {
      manager.addVisual({ source: '/path/to/image.png', title: 'Test' });
      const exported = manager.export();

      manager.clear();
      expect(manager.listVisuals().length).toBe(0);

      const imported = manager.import(exported);
      expect(imported).toBe(1);
      expect(manager.listVisuals().length).toBe(1);
    });
  });
});
