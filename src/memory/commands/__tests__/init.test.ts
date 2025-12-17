/**
 * /init Command Tests
 *
 * Tests for codebase analysis and initial memory population:
 * - Project structure scanning
 * - Tech stack detection
 * - Pattern identification
 * - Memory block creation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  scanProjectStructure,
  detectTechStack,
  detectPatterns,
  createInitialMemory,
  initCommand,
  type ProjectStructure,
  type TechStack,
} from '../init.js';
import { MemoryService } from '../../service.js';

// =============================================================================
// Test Setup
// =============================================================================

let testDir: string;

function createTestDir(): string {
  const dir = join(tmpdir(), `yoyo-init-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupTestDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Create a sample project structure for testing.
 */
function createSampleProject(dir: string, type: 'typescript' | 'python' | 'rust' | 'go' = 'typescript'): void {
  // Create directories
  mkdirSync(join(dir, 'src', 'components'), { recursive: true });
  mkdirSync(join(dir, 'src', 'utils'), { recursive: true });
  mkdirSync(join(dir, 'tests'), { recursive: true });
  mkdirSync(join(dir, '.git'), { recursive: true });

  if (type === 'typescript') {
    // package.json
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            react: '^18.0.0',
            'react-dom': '^18.0.0',
          },
          devDependencies: {
            typescript: '^5.0.0',
            vitest: '^2.0.0',
            tailwindcss: '^4.0.0',
          },
        },
        null,
        2
      )
    );

    // tsconfig.json
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            strict: true,
          },
        },
        null,
        2
      )
    );

    // Sample source files
    writeFileSync(
      join(dir, 'src', 'index.ts'),
      `export function main() {
  console.log('Hello, World!');
}
`
    );

    writeFileSync(
      join(dir, 'src', 'components', 'Button.tsx'),
      `import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

export function Button({ onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}
`
    );
  } else if (type === 'python') {
    // pyproject.toml
    writeFileSync(
      join(dir, 'pyproject.toml'),
      `[project]
name = "test-project"
version = "1.0.0"
dependencies = [
    "fastapi>=0.100.0",
    "sqlalchemy>=2.0.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
`
    );

    // Sample Python file
    writeFileSync(
      join(dir, 'src', 'main.py'),
      `from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}
`
    );
  } else if (type === 'rust') {
    // Cargo.toml
    writeFileSync(
      join(dir, 'Cargo.toml'),
      `[package]
name = "test-project"
version = "1.0.0"
edition = "2021"

[dependencies]
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
`
    );

    // Sample Rust file
    writeFileSync(
      join(dir, 'src', 'main.rs'),
      `fn main() {
    println!("Hello, World!");
}
`
    );
  } else if (type === 'go') {
    // go.mod
    writeFileSync(
      join(dir, 'go.mod'),
      `module test-project

go 1.21

require (
    github.com/gin-gonic/gin v1.9.0
)
`
    );

    // Sample Go file
    writeFileSync(
      join(dir, 'src', 'main.go'),
      `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`
    );
  }
}

beforeEach(() => {
  testDir = createTestDir();
});

afterEach(() => {
  cleanupTestDir(testDir);
});

// =============================================================================
// scanProjectStructure Tests
// =============================================================================

describe('scanProjectStructure', () => {
  it('should scan directory structure', () => {
    createSampleProject(testDir);

    const structure = scanProjectStructure(testDir);

    expect(structure.root).toBe(testDir);
    expect(structure.directories).toContain('src');
    expect(structure.directories).toContain('tests');
  });

  it('should identify key files', () => {
    createSampleProject(testDir);

    const structure = scanProjectStructure(testDir);

    expect(structure.keyFiles).toContain('package.json');
    expect(structure.keyFiles).toContain('tsconfig.json');
  });

  it('should count files by extension', () => {
    createSampleProject(testDir);

    const structure = scanProjectStructure(testDir);

    expect(structure.fileTypes['.ts']).toBeGreaterThan(0);
    expect(structure.fileTypes['.tsx']).toBeGreaterThan(0);
  });

  it('should calculate total file count', () => {
    createSampleProject(testDir);

    const structure = scanProjectStructure(testDir);

    expect(structure.totalFiles).toBeGreaterThan(0);
  });
});

// =============================================================================
// detectTechStack Tests
// =============================================================================

describe('detectTechStack', () => {
  it('should detect TypeScript project', () => {
    createSampleProject(testDir, 'typescript');

    const techStack = detectTechStack(testDir);

    expect(techStack.language).toBe('TypeScript');
    expect(techStack.framework).toBe('React');
  });

  it('should detect Python project', () => {
    createSampleProject(testDir, 'python');

    const techStack = detectTechStack(testDir);

    expect(techStack.language).toBe('Python');
    expect(techStack.framework).toBe('FastAPI');
  });

  it('should detect Rust project', () => {
    createSampleProject(testDir, 'rust');

    const techStack = detectTechStack(testDir);

    expect(techStack.language).toBe('Rust');
  });

  it('should detect Go project', () => {
    createSampleProject(testDir, 'go');

    const techStack = detectTechStack(testDir);

    expect(techStack.language).toBe('Go');
    expect(techStack.framework).toBe('Gin');
  });

  it('should detect testing framework', () => {
    createSampleProject(testDir, 'typescript');

    const techStack = detectTechStack(testDir);

    expect(techStack.testing).toBe('Vitest');
  });

  it('should detect styling framework', () => {
    createSampleProject(testDir, 'typescript');

    const techStack = detectTechStack(testDir);

    expect(techStack.styling).toBe('Tailwind CSS');
  });
});

// =============================================================================
// detectPatterns Tests
// =============================================================================

describe('detectPatterns', () => {
  it('should detect component-based architecture', () => {
    createSampleProject(testDir, 'typescript');

    const patterns = detectPatterns(testDir);

    expect(patterns).toContain('component-based');
  });

  it('should detect test-driven development when tests exist', () => {
    createSampleProject(testDir);
    writeFileSync(
      join(testDir, 'tests', 'sample.test.ts'),
      `import { describe, it, expect } from 'vitest';
describe('sample', () => {
  it('works', () => {
    expect(true).toBe(true);
  });
});
`
    );

    const patterns = detectPatterns(testDir);

    expect(patterns).toContain('TDD');
  });
});

// =============================================================================
// createInitialMemory Tests
// =============================================================================

describe('createInitialMemory', () => {
  it('should create project memory block', () => {
    createSampleProject(testDir);
    const service = new MemoryService({
      projectRoot: testDir,
      globalPath: join(testDir, 'global-memory'),
    });
    service.initialize();

    createInitialMemory(service, testDir);

    const project = service.getProject();
    expect(project).not.toBeNull();
    expect(project?.name).toBe('test-project');

    service.close();
  });

  it('should create persona memory block', () => {
    createSampleProject(testDir);
    const service = new MemoryService({
      projectRoot: testDir,
      globalPath: join(testDir, 'global-memory'),
    });
    service.initialize();

    createInitialMemory(service, testDir);

    const persona = service.getPersona();
    expect(persona).not.toBeNull();
    expect(persona?.expertise_areas).toContain('TypeScript');

    service.close();
  });

  it('should include detected patterns in project block', () => {
    createSampleProject(testDir);
    const service = new MemoryService({
      projectRoot: testDir,
      globalPath: join(testDir, 'global-memory'),
    });
    service.initialize();

    createInitialMemory(service, testDir);

    const project = service.getProject();
    expect(project?.patterns).toContain('component-based');

    service.close();
  });
});

// =============================================================================
// initCommand Tests
// =============================================================================

describe('initCommand', () => {
  it('should initialize memory and return success', async () => {
    createSampleProject(testDir);
    const service = new MemoryService({
      projectRoot: testDir,
      globalPath: join(testDir, 'global-memory'),
    });
    service.initialize();

    const result = await initCommand(service, testDir);

    expect(result.success).toBe(true);
    expect(result.blocksCreated).toBeGreaterThan(0);

    service.close();
  });

  it('should emit progress events', async () => {
    createSampleProject(testDir);
    const service = new MemoryService({
      projectRoot: testDir,
      globalPath: join(testDir, 'global-memory'),
    });
    service.initialize();

    const progressEvents: { step: string; progress: number }[] = [];
    service.on('memory:init:progress', (event) => {
      progressEvents.push(event);
    });

    await initCommand(service, testDir);

    expect(progressEvents.length).toBeGreaterThan(0);
    expect(progressEvents.some((e) => e.step === 'scanning')).toBe(true);
    expect(progressEvents.some((e) => e.step === 'detecting')).toBe(true);

    service.close();
  });

  it('should emit completion event', async () => {
    createSampleProject(testDir);
    const service = new MemoryService({
      projectRoot: testDir,
      globalPath: join(testDir, 'global-memory'),
    });
    service.initialize();

    const completionListener = vi.fn();
    service.on('memory:init:complete', completionListener);

    await initCommand(service, testDir);

    expect(completionListener).toHaveBeenCalledTimes(1);
    expect(completionListener.mock.calls[0]?.[0]).toHaveProperty('blocks');
    expect(completionListener.mock.calls[0]?.[0]).toHaveProperty('duration');

    service.close();
  });

  it('should not overwrite existing memory by default', async () => {
    createSampleProject(testDir);
    const service = new MemoryService({
      projectRoot: testDir,
      globalPath: join(testDir, 'global-memory'),
    });
    service.initialize();

    // Create existing memory
    service.saveBlock('persona', {
      name: 'ExistingAgent',
      traits: ['existing'],
      communication_style: 'existing',
      expertise_areas: ['existing'],
    });

    const result = await initCommand(service, testDir, { force: false });

    // Should skip because memory already exists
    const persona = service.getPersona();
    expect(persona?.name).toBe('ExistingAgent');

    service.close();
  });

  it('should overwrite existing memory when force=true', async () => {
    createSampleProject(testDir);
    const service = new MemoryService({
      projectRoot: testDir,
      globalPath: join(testDir, 'global-memory'),
    });
    service.initialize();

    // Create existing memory
    service.saveBlock('persona', {
      name: 'ExistingAgent',
      traits: ['existing'],
      communication_style: 'existing',
      expertise_areas: ['existing'],
    });

    await initCommand(service, testDir, { force: true });

    const persona = service.getPersona();
    expect(persona?.name).not.toBe('ExistingAgent');

    service.close();
  });
});
