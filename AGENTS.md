# AGENTS.md - Development Guidelines for AI Agents

This file contains build commands, code style guidelines, and development patterns for agentic coding agents working in the Yoyo Dev repository.

## Build Commands

### TypeScript/Node.js (Primary)
```bash
# Build the project
npm run build

# Clean build
npm run build:clean

# Development with watch
npm run dev

# Run CLI
npm run cli

# Development CLI with watch
npm run cli:dev
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run single test file (vitest)
npx vitest run src/memory/__tests__/store.test.ts

# Run tests in watch mode
npx vitest watch

# Run tests matching pattern
npx vitest run --grep "memory"
```

### Linting & Formatting
```bash
# Check code (lint + format)
npm run lint

# Format code
npm run format

# Check only (no auto-fix)
npx biome check src/

# Format only
npx biome format --write src/
```

### Python (TUI Dashboard)
```bash
# Run all Python tests
pytest tests/ -v

# Run specific test file
pytest tests/test_command_executor.py -v

# Run with coverage
pytest tests/ --cov=lib/yoyo_tui_v3 --cov-report=html

# Run specific test category
pytest tests/widgets/ -v
pytest tests/screens/ -v
pytest tests/services/ -v

# Quick test (quiet mode)
pytest tests/ -v --tb=no -q

# Skip manual tests
pytest tests/ -m "not manual"
```

## Code Style Guidelines

### TypeScript Patterns

#### File Organization
- Use barrel exports (`index.ts`) for clean imports
- Co-locate test files with source: `src/__tests__/` or `src/module/__tests__/`
- Group related functionality in directories
- Use `.js` extensions for imports (ESM)

#### Import Style
```typescript
// External dependencies first
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

// Internal imports (use .js for ESM)
import type {
  MemoryBlock,
  MemoryBlockType,
} from './types.js';
import { MemoryStore } from './store.js';
```

#### Type Definitions
- Use `interface` for object shapes
- Use `type` for unions, computed types, or primitives
- Export types separately from implementations
- Use JSDoc comments for complex types
- Prefer readonly properties where appropriate

#### Error Handling
```typescript
// Custom error classes with structured codes
export class MemoryError extends Error {
  constructor(
    message: string,
    public readonly code: MemoryErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MemoryError';
  }
}

// Function error handling
try {
  const result = await operation();
  return result;
} catch (error) {
  if (error instanceof MemoryError) {
    // Handle known error
  }
  throw new MemoryError('Operation failed', 'UNKNOWN_ERROR', { original: error });
}
```

#### Naming Conventions
- **Files**: kebab-case for utilities (`memory-store.ts`), PascalCase for classes (`MemoryBlock.ts`)
- **Variables**: camelCase, descriptive names
- **Constants**: UPPER_SNAKE_CASE for exports, camelCase for internal
- **Types**: PascalCase, descriptive suffixes (`Content`, `Input`, `Options`)
- **Interfaces**: PascalCase, no `I` prefix

#### Function Patterns
```typescript
// Async functions with proper error handling
export async function createMemoryBlock(
  input: CreateBlockInput
): Promise<MemoryBlock> {
  validateInput(input);
  
  try {
    const block = await persistBlock(input);
    return block;
  } catch (error) {
    throw new MemoryError('Failed to create block', 'DB_ERROR', { input });
  }
}

// Pure functions for transformations
export function transformContent(content: RawContent): ProcessedContent {
  return {
    ...content,
    processedAt: new Date(),
    version: content.version + 1,
  };
}
```

### Python Patterns

#### File Structure
- Use shebang: `#!/usr/bin/env python3`
- Docstring for every module and class
- Type hints required for all functions
- Use `pathlib` for file operations

#### Import Style
```python
# Standard library first
import sys
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Third-party imports
import pytest
import yaml

# Local imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))
from yoyo_tui.services.command_executor import CommandExecutor
```

#### Testing Patterns
```python
class TestMemoryStore(unittest.TestCase):
    """Test MemoryStore database operations."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.test_db = ":memory:"
        self.store = MemoryStore(self.test_db)
    
    def test_create_block_success(self):
        """Test successful block creation."""
        # Arrange
        input_data = CreateBlockInput(
            type="project",
            scope="test",
            content={"name": "test"}
        )
        
        # Act
        block = self.store.create_block(input_data)
        
        # Assert
        self.assertIsInstance(block, MemoryBlock)
        self.assertEqual(block.type, "project")
```

#### Error Handling
```python
# Custom exceptions with context
class YoyoError(Exception):
    """Base Yoyo Dev error."""
    
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(message)
        self.details = details or {}

# Function error handling
def load_config(path: Path) -> dict:
    """Load configuration from YAML file."""
    try:
        with open(path, 'r') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        raise YoyoError(f"Config not found: {path}")
    except yaml.YAMLError as e:
        raise YoyoError(f"Invalid YAML: {e}", {"path": path})
```

## Development Standards

### TypeScript Configuration
- **Target**: ES2022
- **Module**: ESNext with bundler resolution
- **Strict mode**: Enabled with all strict options
- **JSX**: React-jsx for components
- **Unused code**: `noUnusedLocals` and `noUnusedParameters` enabled

### Testing Standards
- **TDD approach**: Write failing tests first (red phase)
- **Coverage**: Aim for 80%+ on critical paths
- **Test types**: Unit, integration, and E2E tests
- **Mocking**: Use unittest.mock for Python, vi.mock for Vitest

### Code Quality
- **No `any` types**: Use proper TypeScript typing
- **No `@ts-ignore`**: Fix type errors instead
- **Immutable patterns**: Prefer readonly and const
- **Error boundaries**: Handle all error cases
- **Documentation**: JSDoc for public APIs

### Performance Guidelines
- **Database**: Use prepared statements, connection pooling
- **Async**: Prefer async/await over callbacks
- **Memory**: Clean up resources, avoid memory leaks
- **Bundle**: Code splitting for large dependencies

## Project-Specific Patterns

### Memory System
- Use SQLite with better-sqlite3 for sync operations
- UUID v4 for all IDs
- Version fields for optimistic locking
- JSON storage for flexible content

### CLI Architecture
- Commander.js for argument parsing
- Ink for React-based terminal UI
- Service layer for business logic
- Type-safe command definitions

### TUI Dashboard
- Textual framework for rich terminal UI
- Widget-based architecture
- Event-driven updates
- Responsive design principles

## Quality Gates

Before marking any task complete:
1. **TypeScript**: No errors (`tsc --noEmit`)
2. **Linting**: Biome check passes
3. **Tests**: All relevant tests pass
4. **Python**: Pytest suite passes
5. **Functionality**: Feature works as specified
6. **Documentation**: Public APIs documented

## Common Pitfalls to Avoid

1. **Mixed async patterns**: Don't mix callbacks and promises
2. **Global state**: Avoid mutable globals, use dependency injection
3. **Hardcoded paths**: Use Path objects and config
4. **Silent failures**: Always handle and log errors
5. **Type assertion**: Use proper type guards over `as any`
6. **Memory leaks**: Clean up event listeners and connections

## Tooling Notes

- **Biome**: Fast linter/formatter, replaces ESLint/Prettier
- **Vitest**: Test runner with Vite integration
- **tsx**: TypeScript execution for scripts
- **better-sqlite3**: Synchronous SQLite database
- **Textual**: Python TUI framework
- **pytest**: Python test runner with rich plugin ecosystem