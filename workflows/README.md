# Workflows Directory

Reusable workflow components for Yoyo Dev commands and agents.

## Purpose

Workflows are self-contained markdown files that define reusable processes. They can be referenced by agents using the `{{workflows/path/to/workflow.md}}` syntax, allowing for modular composition of complex agent behaviors.

## Directory Structure

```
workflows/
├── planning/           # Product planning workflows
│   ├── gather-product-info.md
│   ├── create-product-mission.md
│   ├── create-product-roadmap.md
│   └── create-product-tech-stack.md
├── specification/      # Spec creation workflows
│   ├── initialize-spec.md
│   ├── research-spec.md
│   ├── write-spec.md
│   └── verify-spec.md
└── implementation/     # Task execution workflows
    ├── create-tasks-list.md
    ├── implement-tasks.md
    ├── compile-implementation-standards.md
    └── verification/   # Verification sub-workflows
        ├── verify-functionality.md
        ├── verify-tests.md
        ├── verify-accessibility.md
        ├── verify-performance.md
        ├── verify-security.md
        └── verify-documentation.md
```

## Workflow Reference Syntax

### Basic Usage

In an agent file (`.yoyo-dev/claude-code/agents/*.md`):

```markdown
---
name: implementer
description: Executes task implementation
tools: [Write, Read, Bash]
---

# Implementer Agent

You are specialized in implementing tasks following TDD principles.

## Workflow

{{workflows/implementation/implement-tasks.md}}

## Additional Instructions

When implementing tasks:
- Always write tests first
- Follow tech stack standards
- Create implementation reports if enabled
```

### Nested Composition

Workflows can reference other workflows (max 3 levels deep):

```markdown
# Main Workflow

Step 1: Initialize
{{workflows/specification/initialize-spec.md}}

Step 2: Research
{{workflows/specification/research-spec.md}}

Step 3: Verify
{{workflows/specification/verify-spec.md}}
```

### Expansion Process

When an agent is invoked via the Task tool:

1. Parse agent file and extract YAML frontmatter
2. Find all `{{workflows/*}}` references in agent body
3. Read referenced workflow files from disk
4. Replace references with workflow content inline
5. Recursively expand nested references (max 3 levels)
6. Detect cycles and throw error if found
7. Execute agent with fully expanded instructions

## Creating New Workflows

### Best Practices

1. **Self-Contained** - Workflows should be complete and standalone
2. **Single Responsibility** - Each workflow focuses on one process
3. **Clear Structure** - Use headings, checklists, and bullet points
4. **Avoid Hard-Coding** - Use placeholders for dynamic values
5. **Document Purpose** - Start with a clear purpose statement
6. **Keep Concise** - Aim for 10-50 lines per workflow
7. **Test Independently** - Verify workflow makes sense on its own

### Template Structure

```markdown
# Workflow Name

**Purpose:** One-line description of what this workflow does.

## Process

1. **Step 1: Name**
   - Action item
   - Action item
   - Expected outcome

2. **Step 2: Name**
   - Action item
   - Action item
   - Expected outcome

3. **Step 3: Name**
   - Action item
   - Action item
   - Expected outcome

## Validation

- [ ] Checklist item 1
- [ ] Checklist item 2
- [ ] Checklist item 3

## Error Handling

If [error condition]:
- Do this
- Then do that
- Report to user
```

## Composition Patterns

### Sequential Composition

Execute workflows one after another:

```markdown
## Implementation Workflow

{{workflows/implementation/implement-tasks.md}}

{{workflows/implementation/verification/verify-tests.md}}

{{workflows/implementation/verification/verify-functionality.md}}
```

### Conditional Composition

Reference workflows based on context:

```markdown
## Verification Workflow

Always run:
{{workflows/implementation/verification/verify-functionality.md}}
{{workflows/implementation/verification/verify-tests.md}}

For UI components only:
{{workflows/implementation/verification/verify-accessibility.md}}

For API changes only:
{{workflows/implementation/verification/verify-security.md}}
```

### Parallel Composition

Multiple workflows that can run independently:

```markdown
## Multi-Stage Verification

These can run in parallel:
- {{workflows/implementation/verification/verify-tests.md}}
- {{workflows/implementation/verification/verify-accessibility.md}}
- {{workflows/implementation/verification/verify-performance.md}}
```

## Workflow Categories

### Planning Workflows

Used by `product-planner` agent for product documentation:
- `gather-product-info.md` - Collect product vision, features, users
- `create-product-mission.md` - Generate mission.md document
- `create-product-roadmap.md` - Generate roadmap.md with phases
- `create-product-tech-stack.md` - Document technical architecture

### Specification Workflows

Used by `spec-initializer`, `spec-shaper`, `spec-writer` agents:
- `initialize-spec.md` - Create spec folder structure and state.json
- `research-spec.md` - Gather requirements through targeted questions
- `write-spec.md` - Generate comprehensive spec.md document
- `verify-spec.md` - Validate spec completeness and clarity

### Implementation Workflows

Used by `implementer`, `implementation-verifier`, `tasks-list-creator` agents:
- `create-tasks-list.md` - Break down specs into strategic tasks
- `implement-tasks.md` - Execute task implementation with TDD
- `compile-implementation-standards.md` - Load relevant standards

### Verification Workflows

Used by `implementation-verifier` agent in post-execution:
- `verify-functionality.md` - All features work as specified
- `verify-tests.md` - Tests pass with adequate coverage
- `verify-accessibility.md` - WCAG AA compliance
- `verify-performance.md` - No regressions, meets budgets
- `verify-security.md` - No vulnerabilities
- `verify-documentation.md` - Docs current and complete

## Nesting Limits

**Maximum nesting depth: 3 levels**

```
Agent → Workflow A → Workflow B → Workflow C (depth 3, allowed)
Agent → Workflow A → Workflow B → Workflow C → Workflow D (depth 4, ERROR)
```

This limit prevents over-complexity and performance issues.

## Cycle Detection

Circular references are detected and throw errors:

```markdown
# workflow-a.md
{{workflows/workflow-b.md}}

# workflow-b.md
{{workflows/workflow-a.md}}  # ERROR: Circular reference!
```

Error message will show the full reference chain.

## Performance

- **Caching:** Expanded workflows are cached in memory
- **Cache Key:** File path + modification timestamp
- **Cache Size:** Max 100 workflows
- **Cache Invalidation:** Automatic on file modification
- **Expansion Overhead:** Target < 100ms per agent

## Validation

### Workflow File Validation

Workflows should:
- Be valid markdown (`.md` extension)
- Have clear structure (headings, lists)
- Be self-contained (no external dependencies beyond other workflows)
- Not exceed 200 lines (keep workflows focused)
- Use relative paths for workflow references

### Testing Workflows

To test a workflow:

1. Read the workflow file independently
2. Verify it's clear and makes sense standalone
3. Check for any hard-coded values that should be dynamic
4. Verify any nested workflow references exist
5. Ensure max nesting depth not exceeded

## Migration Guide

### Converting Inline Instructions to Workflows

**Before (inline in agent):**
```markdown
# Agent File

Step 1: Do this
Step 2: Do that
Step 3: Do another thing
```

**After (using workflows):**
```markdown
# Agent File

{{workflows/category/my-workflow.md}}
```

Create `workflows/category/my-workflow.md`:
```markdown
# My Workflow

1. Do this
2. Do that
3. Do another thing
```

### Benefits

- **Reusability:** Same workflow used by multiple agents
- **Maintainability:** Update workflow once, affects all agents
- **Testability:** Workflows can be tested independently
- **Clarity:** Agents become simpler, more focused
- **Composition:** Build complex behaviors from simple workflows

## Examples

### Example 1: Simple Reference

**Agent file:**
```markdown
---
name: spec-writer
description: Creates specification documents
tools: [Write, Read]
---

# Spec Writer Agent

{{workflows/specification/write-spec.md}}
```

### Example 2: Multiple References

**Agent file:**
```markdown
---
name: implementation-verifier
description: Verifies implementation completeness
tools: [Read, Bash]
---

# Implementation Verifier Agent

## Verification Process

Run all verification workflows:

{{workflows/implementation/verification/verify-functionality.md}}

{{workflows/implementation/verification/verify-tests.md}}

{{workflows/implementation/verification/verify-accessibility.md}}

{{workflows/implementation/verification/verify-performance.md}}

{{workflows/implementation/verification/verify-security.md}}

{{workflows/implementation/verification/verify-documentation.md}}

## Reporting

Create verification report with results.
```

### Example 3: Nested Composition

**Agent file:**
```markdown
---
name: product-planner
description: Creates product documentation
tools: [Write, Read, WebFetch]
---

# Product Planner Agent

{{workflows/planning/gather-product-info.md}}

After gathering info, create all product docs:
- {{workflows/planning/create-product-mission.md}}
- {{workflows/planning/create-product-roadmap.md}}
- {{workflows/planning/create-product-tech-stack.md}}
```

## Related Documentation

- Agent Development: `.yoyo-dev/claude-code/agents/README.md`
- Command Instructions: `.yoyo-dev/instructions/core/`
- Configuration: `.yoyo-dev/config.yml`
- Main Documentation: `CLAUDE.md`

## Contributing

When adding new workflows:

1. Follow the template structure
2. Keep workflows focused and concise
3. Document purpose clearly
4. Test workflow independently
5. Update this README with new workflow in appropriate section
6. Ensure no circular references
7. Respect nesting depth limits

---

**Last Updated:** 2025-10-30
**Version:** 1.0.0
