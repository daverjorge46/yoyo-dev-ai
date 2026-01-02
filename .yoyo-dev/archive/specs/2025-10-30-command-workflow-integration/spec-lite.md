# Command Flows & Workflows Integration (Lite)

**Created:** 2025-10-30 | **Status:** Draft

---

## Summary

Integrate command flows from `commands/` and reusable workflows from `workflows/` into Yoyo Dev framework. Add modular workflow system, new specialized agents, advanced orchestration capabilities, and implementation tracking.

**Key Decisions:**
- ✅ Keep `.yoyo-dev/` folder structure (no migration needed)
- ✅ Keep `/create-spec` as-is (comprehensive single-step)
- ✅ Keep `/execute-tasks` as default, add `/orchestrate-tasks` for advanced users
- ✅ Add workflow-based agent system with `{{workflows/*}}` references
- ✅ Add implementation reports and verification workflows

---

## Goals

1. **Integrate Reusable Workflows** - Add modular workflow components that can be referenced by commands/agents
2. **Add New Specialized Agents** - 7 new agents (spec-initializer, spec-shaper, spec-writer, tasks-list-creator, implementer, implementation-verifier, product-planner)
3. **Enable Advanced Orchestration** - `/orchestrate-tasks` for manual multi-agent control
4. **Add Skills Optimization** - `/improve-skills` for Claude Code Skills optimization
5. **Enhance Implementation Tracking** - Optional `implementation/` folder for per-task reports
6. **Add Verification Workflows** - Systematic verification before task completion

---

## Scope

### In Scope

**1. Workflow System**
- Copy `workflows/` directory to Yoyo Dev root
- Organize by category: `planning/`, `specification/`, `implementation/`
- Agents reference workflows using `{{workflows/path/to/workflow.md}}` syntax
- Workflow content expanded inline when agent executes

**2. New Agents (7)**
- `spec-initializer` - Initialize spec folder structure
- `spec-shaper` - Gather requirements through Q&A
- `spec-writer` - Write comprehensive spec documents
- `tasks-list-creator` - Create strategic task breakdowns
- `implementer` - Execute task implementation
- `implementation-verifier` - Verify implementation completeness
- `product-planner` - Create product documentation

**3. New Commands**

**`/orchestrate-tasks`** - Advanced orchestration for complex scenarios
- User selects task groups to execute
- User assigns specialized agents to each group
- User assigns relevant standards to each group
- Creates `orchestration.yml` mapping tasks → agents → standards
- Delegates to assigned agents for parallel execution

**`/improve-skills`** - Optimize Claude Code Skills
- Scans `.claude/skills/` directory
- Analyzes and rewrites skill descriptions
- Adds "When to use this skill" sections
- Improves triggering keywords

**4. Implementation Tracking**
- `/execute-tasks --implementation-reports` creates `implementation/` folder
- Per-task-group reports: approach, decisions, files, tests, challenges, time
- Optional (off by default)

**5. Verification Workflows**
- Systematic verification in post-execution phase
- Creates `verification/final-verification.md` report
- Checks: functionality, tests, accessibility, performance, security, docs

**6. Configuration Updates**
```yaml
multi_agent:
  enabled: true
  use_workflow_references: true

workflows:
  task_execution:
    mode: automatic  # or orchestrated
    implementation_reports: false
    verification_reports: true

agents:
  # New agents
  spec_initializer: true
  spec_shaper: true
  spec_writer: true
  tasks_list_creator: true
  implementer: true
  implementation_verifier: true
  product_planner: true
```

**7. Documentation**
- Update `CLAUDE.md` with new commands
- Add "Advanced Orchestration" section
- Add "Workflow System" section
- Document when to use each execution method

### Out of Scope

- ❌ Two-step spec creation (`/shape-spec` + `/write-spec`)
- ❌ Folder structure change to `yoyo-dev/`
- ❌ Breaking changes to existing commands
- ❌ Automatic skills improvement without approval
- ❌ Migration of existing projects

---

## Architecture

### Three-Layer System

**Layer 1: Commands** - Entry points in `.claude/commands/`
- Example: `/orchestrate-tasks` → `.yoyo-dev/instructions/core/orchestrate-tasks.md`

**Layer 2: Instructions** - Command logic in `.yoyo-dev/instructions/core/`
- XML-structured with `<step>` tags
- Define workflow and subagent delegation

**Layer 3: Workflows** - Reusable components in `workflows/`
- Markdown format, self-contained
- Referenced by agents using `{{workflows/*}}`

### Workflow Reference System

**Agent Example:**
```yaml
---
name: implementer
description: Executes task implementation
tools: [Write, Read, Bash, WebFetch, Playwright, IDE]
---

# Implementer Agent

{{workflows/implementation/implement-tasks.md}}

## Additional Instructions
- Always write tests first
- Follow tech stack standards
```

**Expansion Process:**
1. Parse agent file
2. Find `{{workflows/*}}` references
3. Read workflow files
4. Replace references with content
5. Expand nested references (max 3 levels)
6. Execute agent

---

## File Structure

### New Files

**Workflows:**
```
workflows/
├── planning/
│   ├── gather-product-info.md
│   ├── create-product-mission.md
│   ├── create-product-roadmap.md
│   └── create-product-tech-stack.md
├── specification/
│   ├── initialize-spec.md
│   ├── research-spec.md
│   ├── write-spec.md
│   └── verify-spec.md
└── implementation/
    ├── create-tasks-list.md
    ├── implement-tasks.md
    ├── compile-implementation-standards.md
    └── verification/
        ├── verify-functionality.md
        ├── verify-tests.md
        ├── verify-accessibility.md
        ├── verify-performance.md
        ├── verify-security.md
        └── verify-documentation.md
```

**New Agents:** 7 files in `.yoyo-dev/claude-code/agents/`

**New Commands:** 2 entry points in `.claude/commands/`, 2 instructions in `.yoyo-dev/instructions/core/`

### Modified Files

**Agents:**
- `product-planner.md` - Add workflow references
- `implementer.md` - Add workflow references
- `implementation-verifier.md` - Add workflow references
- `spec-writer.md` - Add workflow references

**Instructions:**
- `execute-tasks.md` - Add `--implementation-reports` flag
- `post-execution-tasks.md` - Add verification workflows

**Configuration:**
- `config.yml` - Add multi-agent, workflows, agents, skills sections

**Documentation:**
- `CLAUDE.md` - Add new commands, workflow system, orchestration guide

---

## Implementation Phases

**Phase 1: Foundation** - Add workflow system
**Phase 2: New Agents** - Create 7 specialized agents
**Phase 3: New Commands** - `/orchestrate-tasks` + `/improve-skills`
**Phase 4: Enhanced Features** - Implementation tracking + verification
**Phase 5: Config & Docs** - Update configuration and documentation
**Phase 6: Integration Testing** - Verify all features work together

**Total Estimate:** 16-22 hours

---

## Requirements Summary

### Functional Requirements

**Workflow System:**
- Workflows directory structure preserved
- `{{workflows/*}}` syntax supported
- Inline expansion working
- Nested composition (max 3 levels)

**New Agents:**
- All 7 agents with YAML frontmatter
- Workflow references included
- "When to use" sections added
- Registered in config

**New Commands:**
- `/orchestrate-tasks` - Full orchestration workflow
- `/improve-skills` - Skills optimization
- XML instruction format
- Rich terminal output

**Enhanced Features:**
- Implementation reports (optional)
- Verification workflows (integrated)
- Orchestration.yml generation
- Skills optimization working

### Non-Functional Requirements

**Backward Compatibility:**
- Existing commands work unchanged
- No project migration needed
- No breaking interface changes

**Performance:**
- Workflow expansion < 100ms overhead
- Max 3 levels nesting
- Parallel verification
- No execution slowdown

**Maintainability:**
- Self-contained workflows
- Clear separation (instructions vs. workflows)
- Documented patterns

**Usability:**
- Default behavior unchanged
- Opt-in features
- Clear guidance
- Good error messages

---

## Success Criteria

**Must Have (P0):**
- ✅ Existing commands work unchanged
- ✅ Workflow system functional
- ✅ All 7 new agents working
- ✅ Both new commands functional
- ✅ Config updated and valid
- ✅ Documentation complete

**Should Have (P1):**
- ✅ Implementation reports working
- ✅ Verification integrated
- ✅ Enhanced agents using workflows
- ✅ No performance degradation
- ✅ Rich terminal output

---

## Key Examples

### Orchestration.yml Example

```yaml
orchestration:
  spec_folder: .yoyo-dev/specs/2025-10-30-user-profile
  task_groups:
    - group_number: 1
      group_name: Database Schema
      agent: implementer
      standards: [best-practices.md, code-style/typescript.md]
      status: pending

execution:
  parallel_groups:
    - [1]  # Database first
    - [2]  # API second
    - [3]  # Frontend third
    - [4]  # Tests last
```

### Implementation Report Example

```markdown
# Implementation Report: Task Group 1 - Database Schema

**Status:** ✅ Completed
**Agent:** implementer
**Date:** 2025-10-30

## Implementation Approach
Used Convex schema definition with TypeScript types.

## Files Created
- convex/schema.ts (modified)
- convex/migrations/001_profiles.ts
- convex/profiles.test.ts

## Tests Added
1. should create profile with valid data
2. should enforce required fields
3. should validate userId reference

**Coverage:** 100%

## Time
**Estimated:** 30 min | **Actual:** 25 min | **Variance:** -5 min
```

---

## Risks & Mitigation

**Workflow Complexity** → Limit nesting to 3 levels, add cycle detection
**Performance Overhead** → Cache expansions, make reports optional, parallel verification
**User Confusion** → Clear defaults, document use cases, decision tree in docs
**Workflow Maintainability** → Enforce structure, self-contained files, clear docs
**Breaking Agent Changes** → Comprehensive testing, workflow-free fallback

---

## Related Documents

- Command Flows: `commands/orchestrate-tasks/`, `commands/improve-skills/`
- Workflows: `workflows/planning/`, `workflows/specification/`, `workflows/implementation/`
- Instructions: `.yoyo-dev/instructions/core/`
- Agents: `.yoyo-dev/claude-code/agents/`
- Configuration: `.yoyo-dev/config.yml`
- Documentation: `CLAUDE.md`
