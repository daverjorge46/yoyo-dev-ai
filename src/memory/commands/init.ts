/**
 * /init Command Implementation
 *
 * Performs deep codebase analysis to populate initial memory:
 * - Scans project structure
 * - Detects tech stack from config files
 * - Identifies coding patterns
 * - Creates project and persona memory blocks
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import type { MemoryService } from '../service.js';
import type {
  PersonaContent,
  ProjectContent,
  InitOptions,
} from '../types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Scanned project structure.
 */
export interface ProjectStructure {
  root: string;
  directories: string[];
  keyFiles: string[];
  fileTypes: Record<string, number>;
  totalFiles: number;
}

/**
 * Detected technology stack.
 */
export interface TechStack {
  language: string;
  framework?: string;
  database?: string;
  styling?: string;
  testing?: string;
  buildTool?: string;
}

/**
 * Result of init command execution.
 */
export interface InitResult {
  success: boolean;
  blocksCreated: number;
  message: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Files that indicate project configuration.
 */
const KEY_FILES = [
  'package.json',
  'tsconfig.json',
  'pyproject.toml',
  'setup.py',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  '.gitignore',
  'README.md',
  'docker-compose.yml',
  'Dockerfile',
];

/**
 * Directories to ignore during scanning.
 */
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.venv',
  'venv',
  'target',
  '.yoyo-ai',
  '.yoyo-dev',
  'coverage',
  '.next',
  '.nuxt',
];

// =============================================================================
// Project Structure Scanning
// =============================================================================

/**
 * Scan project structure to understand layout.
 *
 * @param projectRoot - Project root directory
 * @returns Scanned project structure
 */
export function scanProjectStructure(projectRoot: string): ProjectStructure {
  const directories: string[] = [];
  const keyFiles: string[] = [];
  const fileTypes: Record<string, number> = {};
  let totalFiles = 0;

  // Recursive directory scanner
  function scanDir(dir: string, depth = 0): void {
    if (depth > 5) return; // Limit depth

    const dirName = basename(dir);
    if (IGNORE_DIRS.includes(dirName)) return;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = fullPath.replace(projectRoot + '/', '');

        if (entry.isDirectory()) {
          if (!IGNORE_DIRS.includes(entry.name)) {
            directories.push(relativePath);
            scanDir(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          totalFiles++;

          // Track file types
          const ext = extname(entry.name);
          if (ext) {
            fileTypes[ext] = (fileTypes[ext] ?? 0) + 1;
          }

          // Check for key files at root level
          if (depth === 0 && KEY_FILES.includes(entry.name)) {
            keyFiles.push(entry.name);
          }
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  scanDir(projectRoot);

  return {
    root: projectRoot,
    directories,
    keyFiles,
    fileTypes,
    totalFiles,
  };
}

// =============================================================================
// Tech Stack Detection
// =============================================================================

/**
 * Detect technology stack from project files.
 *
 * @param projectRoot - Project root directory
 * @returns Detected tech stack
 */
export function detectTechStack(projectRoot: string): TechStack {
  const techStack: TechStack = {
    language: 'Unknown',
  };

  // Check for package.json (Node.js/TypeScript)
  const packageJsonPath = join(projectRoot, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Check for TypeScript
      if (allDeps.typescript || existsSync(join(projectRoot, 'tsconfig.json'))) {
        techStack.language = 'TypeScript';
      } else {
        techStack.language = 'JavaScript';
      }

      // Detect framework
      if (allDeps.react) {
        techStack.framework = 'React';
        if (allDeps.next) techStack.framework = 'Next.js';
      } else if (allDeps.vue) {
        techStack.framework = 'Vue';
        if (allDeps.nuxt) techStack.framework = 'Nuxt';
      } else if (allDeps.svelte) {
        techStack.framework = 'Svelte';
      } else if (allDeps['@angular/core']) {
        techStack.framework = 'Angular';
      } else if (allDeps.express) {
        techStack.framework = 'Express';
      } else if (allDeps.fastify) {
        techStack.framework = 'Fastify';
      } else if (allDeps.hono) {
        techStack.framework = 'Hono';
      }

      // Detect testing
      if (allDeps.vitest) {
        techStack.testing = 'Vitest';
      } else if (allDeps.jest) {
        techStack.testing = 'Jest';
      } else if (allDeps.mocha) {
        techStack.testing = 'Mocha';
      }

      // Detect styling
      if (allDeps.tailwindcss) {
        techStack.styling = 'Tailwind CSS';
      } else if (allDeps['styled-components']) {
        techStack.styling = 'styled-components';
      } else if (allDeps['@emotion/react']) {
        techStack.styling = 'Emotion';
      }

      // Detect database
      if (allDeps.prisma || allDeps['@prisma/client']) {
        techStack.database = 'Prisma';
      } else if (allDeps.mongoose) {
        techStack.database = 'MongoDB';
      } else if (allDeps.pg) {
        techStack.database = 'PostgreSQL';
      } else if (allDeps['better-sqlite3']) {
        techStack.database = 'SQLite';
      }

      // Detect build tool
      if (allDeps.vite) {
        techStack.buildTool = 'Vite';
      } else if (allDeps.webpack) {
        techStack.buildTool = 'Webpack';
      } else if (allDeps.esbuild) {
        techStack.buildTool = 'esbuild';
      }
    } catch {
      // Invalid JSON
    }
  }

  // Check for pyproject.toml (Python)
  const pyprojectPath = join(projectRoot, 'pyproject.toml');
  if (existsSync(pyprojectPath)) {
    techStack.language = 'Python';

    try {
      const content = readFileSync(pyprojectPath, 'utf-8');

      if (content.includes('fastapi')) {
        techStack.framework = 'FastAPI';
      } else if (content.includes('django')) {
        techStack.framework = 'Django';
      } else if (content.includes('flask')) {
        techStack.framework = 'Flask';
      }

      if (content.includes('pytest')) {
        techStack.testing = 'pytest';
      }

      if (content.includes('sqlalchemy')) {
        techStack.database = 'SQLAlchemy';
      }
    } catch {
      // Read error
    }
  }

  // Check for Cargo.toml (Rust)
  const cargoPath = join(projectRoot, 'Cargo.toml');
  if (existsSync(cargoPath)) {
    techStack.language = 'Rust';

    try {
      const content = readFileSync(cargoPath, 'utf-8');

      if (content.includes('actix-web')) {
        techStack.framework = 'Actix Web';
      } else if (content.includes('axum')) {
        techStack.framework = 'Axum';
      } else if (content.includes('rocket')) {
        techStack.framework = 'Rocket';
      }
    } catch {
      // Read error
    }
  }

  // Check for go.mod (Go)
  const goModPath = join(projectRoot, 'go.mod');
  if (existsSync(goModPath)) {
    techStack.language = 'Go';

    try {
      const content = readFileSync(goModPath, 'utf-8');

      if (content.includes('gin-gonic/gin')) {
        techStack.framework = 'Gin';
      } else if (content.includes('echo')) {
        techStack.framework = 'Echo';
      } else if (content.includes('fiber')) {
        techStack.framework = 'Fiber';
      }
    } catch {
      // Read error
    }
  }

  return techStack;
}

// =============================================================================
// Pattern Detection
// =============================================================================

/**
 * Detect coding patterns from project structure.
 *
 * @param projectRoot - Project root directory
 * @returns Array of detected patterns
 */
export function detectPatterns(projectRoot: string): string[] {
  const patterns: string[] = [];

  // Check for components directory (component-based)
  if (existsSync(join(projectRoot, 'src', 'components')) ||
      existsSync(join(projectRoot, 'components'))) {
    patterns.push('component-based');
  }

  // Check for tests directory (TDD)
  if (existsSync(join(projectRoot, 'tests')) ||
      existsSync(join(projectRoot, '__tests__')) ||
      existsSync(join(projectRoot, 'test'))) {
    patterns.push('TDD');
  }

  // Check for hooks directory (React hooks pattern)
  if (existsSync(join(projectRoot, 'src', 'hooks'))) {
    patterns.push('custom-hooks');
  }

  // Check for services directory (service pattern)
  if (existsSync(join(projectRoot, 'src', 'services')) ||
      existsSync(join(projectRoot, 'services'))) {
    patterns.push('service-layer');
  }

  // Check for utils directory (utility pattern)
  if (existsSync(join(projectRoot, 'src', 'utils')) ||
      existsSync(join(projectRoot, 'utils')) ||
      existsSync(join(projectRoot, 'lib'))) {
    patterns.push('utility-functions');
  }

  // Check for models directory (model pattern)
  if (existsSync(join(projectRoot, 'src', 'models')) ||
      existsSync(join(projectRoot, 'models'))) {
    patterns.push('model-layer');
  }

  // Check for API routes directory (API pattern)
  if (existsSync(join(projectRoot, 'src', 'api')) ||
      existsSync(join(projectRoot, 'api')) ||
      existsSync(join(projectRoot, 'src', 'routes'))) {
    patterns.push('REST-API');
  }

  // Check for store/redux directory (state management)
  if (existsSync(join(projectRoot, 'src', 'store')) ||
      existsSync(join(projectRoot, 'src', 'redux')) ||
      existsSync(join(projectRoot, 'store'))) {
    patterns.push('state-management');
  }

  return patterns;
}

// =============================================================================
// Memory Creation
// =============================================================================

/**
 * Create initial memory blocks from detected information.
 *
 * @param service - MemoryService instance
 * @param projectRoot - Project root directory
 * @param options - Init options
 */
export function createInitialMemory(
  service: MemoryService,
  projectRoot: string,
  _options: InitOptions = {}
): void {
  const structure = scanProjectStructure(projectRoot);
  const techStack = detectTechStack(projectRoot);
  const patterns = detectPatterns(projectRoot);

  // Get project name from package.json or directory name
  let projectName = basename(projectRoot);
  const packageJsonPath = join(projectRoot, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      if (packageJson.name) {
        projectName = packageJson.name;
      }
    } catch {
      // Use directory name
    }
  }

  // Build tech_stack object conditionally to handle exactOptionalPropertyTypes
  const techStackContent: ProjectContent['tech_stack'] = {
    language: techStack.language,
    framework: techStack.framework ?? 'None',
  };
  if (techStack.database) techStackContent.database = techStack.database;
  if (techStack.styling) techStackContent.styling = techStack.styling;
  if (techStack.testing) techStackContent.testing = techStack.testing;
  if (techStack.buildTool) techStackContent.build_tool = techStack.buildTool;

  // Create project block
  const projectContent: ProjectContent = {
    name: projectName,
    description: `${techStack.language} project${techStack.framework ? ` using ${techStack.framework}` : ''}`,
    tech_stack: techStackContent,
    architecture: patterns.includes('component-based') ? 'component-based' : 'modular',
    patterns,
    key_directories: buildKeyDirectories(structure),
    key_files: structure.keyFiles,
  };

  service.saveBlock('project', projectContent);

  // Create persona block based on tech stack
  const expertiseAreas: string[] = [techStack.language];
  if (techStack.framework) expertiseAreas.push(techStack.framework);
  if (techStack.testing) expertiseAreas.push(techStack.testing);

  const personaContent: PersonaContent = {
    name: 'Yoyo',
    traits: ['helpful', 'thorough', 'context-aware'],
    communication_style: 'technical',
    expertise_areas: expertiseAreas,
  };

  service.saveBlock('persona', personaContent);
}

/**
 * Build key directories map from structure.
 */
function buildKeyDirectories(structure: ProjectStructure): Record<string, string> {
  const keyDirs: Record<string, string> = {};

  const descriptions: Record<string, string> = {
    src: 'Source code',
    'src/components': 'UI components',
    'src/hooks': 'Custom React hooks',
    'src/utils': 'Utility functions',
    'src/services': 'Service layer',
    'src/models': 'Data models',
    'src/api': 'API routes',
    'src/store': 'State management',
    tests: 'Test files',
    __tests__: 'Test files',
    lib: 'Library code',
    public: 'Static assets',
    docs: 'Documentation',
  };

  for (const dir of structure.directories) {
    if (descriptions[dir]) {
      keyDirs[dir] = descriptions[dir];
    }
  }

  return keyDirs;
}

// =============================================================================
// Init Command
// =============================================================================

/**
 * Execute the /init command.
 *
 * @param service - MemoryService instance
 * @param projectRoot - Project root directory
 * @param options - Init options
 * @returns Init result
 */
export async function initCommand(
  service: MemoryService,
  projectRoot: string,
  options: InitOptions = {}
): Promise<InitResult> {
  const startTime = Date.now();

  // Check for existing memory (either persona or project)
  const existingProject = service.getProject();
  const existingPersona = service.getPersona();
  if ((existingProject || existingPersona) && !options.force) {
    return {
      success: true,
      blocksCreated: 0,
      message: 'Memory already initialized. Use --force to overwrite.',
    };
  }

  // Emit progress: scanning
  service.emit('memory:init:progress', {
    step: 'scanning',
    progress: 20,
    message: 'Scanning project structure...',
  });

  // Scan is done inside createInitialMemory, but we emit progress here
  // Just detect tech stack for the result message
  const techStack = detectTechStack(projectRoot);

  // Emit progress: detecting tech stack
  service.emit('memory:init:progress', {
    step: 'detecting',
    progress: 50,
    message: 'Detecting technology stack...',
  });

  // Emit progress: creating memory
  service.emit('memory:init:progress', {
    step: 'creating',
    progress: 80,
    message: 'Creating memory blocks...',
  });

  createInitialMemory(service, projectRoot, options);

  // Emit progress: complete
  service.emit('memory:init:progress', {
    step: 'complete',
    progress: 100,
    message: 'Memory initialization complete.',
  });

  const duration = Date.now() - startTime;
  const blocks = service.getAllBlocks();

  // Emit completion event
  service.emit('memory:init:complete', {
    blocks,
    duration,
  });

  return {
    success: true,
    blocksCreated: 2, // project + persona
    message: `Initialized ${techStack.language} project memory in ${duration}ms`,
  };
}
