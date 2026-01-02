# Spec: Command Flows & Workflows Integration

**Created:** 2025-10-30
**Status:** Draft
**Roadmap Item:** System Integration

---

## Overview

Integrate the command flows from the `commands/` directory and reusable workflows from the `workflows/` directory into the Yoyo Dev framework. This integration will enhance the existing system with:

- Modular workflow components that can be reused across commands
- New specialized agents for spec shaping, implementation, and verification
- Advanced orchestration capabilities for complex multi-agent scenarios
- Implementation tracking and verification workflows
- Skills optimization tooling

The integration will maintain the existing `.yoyo-dev/` folder structure and XML-based instruction system while adding workflow-based modularity for enhanced maintainability and reusability.

---

## Goals

### Primary Goals
1. **Integrate Reusable Workflows** - Add modular workflow components from `workflows/` directory that can be referenced by commands and agents
2. **Add New Specialized Agents** - Integrate 7 new agents (spec-initializer, spec-shaper, spec-writer, tasks-list-creator, implementer, implementation-verifier, product-planner)
3. **Enable Advanced Orchestration** - Add `/orchestrate-tasks` command for manual multi-agent orchestration in complex scenarios
4. **Add Skills Optimization** - Integrate `/improve-skills` command for Claude Code Skills optimization
5. **Enhance Implementation Tracking** - Add optional `implementation/` folder structure for per-task implementation reports
6. **Add Verification Workflows** - Integrate systematic verification sub-workflows into post-execution phase

### Secondary Goals
1. **Maintain Backward Compatibility** - All existing Yoyo Dev commands continue to work as-is
2. **Keep Simple Paths Fast** - Don't add overhead to standard workflows
3. **Document Integration Patterns** - Clear guidance on when to use new vs. existing commands
4. **Preserve Folder Structure** - Continue using `.yoyo-dev/` as default (no migration needed)

---

## User Stories

### As a Yoyo Dev User
- I want my existing commands to continue working without changes
- I want to use `/execute-tasks` for normal task execution (automatic, comprehensive)
- I want to optionally use `/orchestrate-tasks` when I need advanced multi-agent control
- I want agents to be more modular and maintainable using workflow references

### As a Command Developer
- I want to create reusable workflow components that can be shared across commands
- I want agents to reference workflows using `{{workflows/path/to/workflow}}` syntax
- I want to build complex commands by composing smaller workflow pieces
- I want clear patterns for when to use XML instructions vs. workflow files

### As an Advanced User
- I want to manually assign specific agents to different task groups
- I want to create orchestration roadmaps for complex multi-agent scenarios
- I want detailed implementation reports for each task group
- I want systematic verification workflows before marking tasks complete

### As a Claude Code Power User
- I want to optimize my Skills for better discoverability
- I want to improve skill descriptions and "when to use" sections
- I want skills to be automatically triggered more reliably

---

## Scope

### In Scope

#### 1. Workflow System Integration
- Copy `workflows/` directory to Yoyo Dev root
- Organize workflows by category:
  - `workflows/planning/` - Product planning workflows
  - `workflows/specification/` - Spec creation workflows
  - `workflows/implementation/` - Task execution workflows
- Create workflow reference system for agents using `{{workflows/*}}` syntax
- Document workflow composition patterns

#### 2. New Agents
Add 7 specialized agents to `.yoyo-dev/claude-code/agents/`:

| Agent | Purpose | Tools | Model |
|-------|---------|-------|-------|
| `spec-initializer` | Initialize spec folder structure | Write, Bash | haiku |
| `spec-shaper` | Gather requirements through Q&A | Write, Read, Bash, WebFetch | sonnet |
| `spec-writer` | Write comprehensive spec documents | Write, Read, Bash, WebFetch | sonnet |
| `tasks-list-creator` | Create strategic task breakdowns | Write, Read, Bash, WebFetch | sonnet |
| `implementer` | Execute task implementation | Write, Read, Bash, WebFetch, Playwright, IDE | sonnet |
| `implementation-verifier` | Verify implementation completeness | Write, Read, Bash, WebFetch, Playwright, IDE | sonnet |
| `product-planner` | Create product documentation | Write, Read, Bash, WebFetch | sonnet |

Each agent should:
- Include YAML frontmatter (name, description, tools, color, model)
- Reference appropriate workflows using `{{workflows/*}}` syntax
- Include standards compliance section where applicable
- Document when to use the agent

#### 3. New Commands

##### `/orchestrate-tasks` Command
Advanced orchestration for complex multi-agent scenarios:
- Ask user which task groups to execute
- Ask user to assign specialized agents to each group
- Ask user to assign relevant standards to each group
- Create `orchestration.yml` file mapping tasks → agents → standards
- Optionally generate prompt files for queued execution
- Delegate to assigned agents for parallel execution
- Aggregate results and create orchestration report

**Command entry point:** `.claude/commands/orchestrate-tasks.md`
**Instruction file:** `.yoyo-dev/instructions/core/orchestrate-tasks.md`
**Format:** XML-structured with `<step>` tags and subagent delegation

##### `/improve-skills` Command
Optimize Claude Code Skills for better discoverability:
- Scan `.claude/skills/` directory
- For each `SKILL.md` file:
  - Analyze current description
  - Rewrite for clarity and discoverability
  - Add "When to use this skill" section
  - Improve skill triggering keywords
- Create optimization report
- Ask user to review changes before applying

**Command entry point:** `.claude/commands/improve-skills.md`
**Instruction file:** `.yoyo-dev/instructions/core/improve-skills.md`
**Format:** XML-structured with `<step>` tags

#### 4. Enhanced Agents
Update existing agents to reference workflows:

**Agents to update:**
- `product-planner.md` - Reference `workflows/planning/*`
- `spec-writer.md` - Reference `workflows/specification/*`
- `implementer.md` - Reference `workflows/implementation/*`
- `implementation-verifier.md` - Reference `workflows/implementation/verification/*`

**Update pattern:**
```yaml
---
name: spec-writer
description: Creates comprehensive specification documents
tools: [Write, Read, Bash, WebFetch]
color: blue
model: sonnet
---

# Spec Writer Agent

You are a specialized agent that creates comprehensive specification documents.

## Workflow

{{workflows/specification/write-spec.md}}

## Standards Compliance

When writing specs, follow these standards:
- `.yoyo-dev/standards/best-practices.md`
- `.yoyo-dev/standards/tech-stack.md`
```

#### 5. Implementation Tracking
Add optional implementation tracking to `/execute-tasks`:

- Add `--implementation-reports` flag to `/execute-tasks`
- When enabled, create `implementation/` folder in spec directory
- For each task group, create `implementation/task-group-N.md` with:
  - Implementation approach
  - Key decisions made
  - Files created/modified
  - Tests added
  - Challenges encountered
  - Time estimate vs. actual

**Example structure:**
```
.yoyo-dev/specs/2025-10-30-feature-name/
├── spec.md
├── spec-lite.md
├── tasks.md
├── decisions.md
├── implementation/
│   ├── task-group-1-database-schema.md
│   ├── task-group-2-api-endpoints.md
│   ├── task-group-3-frontend-components.md
│   └── task-group-4-testing.md
└── verification/
    └── final-verification.md
```

#### 6. Verification Workflows
Add systematic verification to post-execution phase:

- Copy verification workflows from `workflows/implementation/verification/`
- Integrate into `post-execution-tasks.md`
- Add verification step before marking tasks complete
- Create `verification/final-verification.md` report with:
  - Functionality verification
  - Test coverage verification
  - Accessibility verification
  - Performance verification
  - Security verification
  - Documentation verification

#### 7. Configuration Updates
Update `.yoyo-dev/config.yml` with new options:

```yaml
# Multi-agent workflow options
multi_agent:
  enabled: true
  use_workflow_references: true  # Enable {{workflows/*}} syntax

# Workflow preferences
workflows:
  task_execution:
    mode: automatic  # automatic (/execute-tasks) or orchestrated (/orchestrate-tasks)
    implementation_reports: false  # Create implementation/ folder
    verification_reports: true     # Create verification/ folder

# Agent configuration
agents:
  # Existing agents
  context_fetcher: true
  file_creator: true
  git_workflow: true
  project_manager: true
  test_runner: true
  date_checker: true
  design_analyzer: true
  design_validator: true

  # New agents
  spec_initializer: true
  spec_shaper: true
  spec_writer: true
  tasks_list_creator: true
  implementer: true
  implementation_verifier: true
  product_planner: true

# Skills optimization
skills:
  auto_improve: false  # Automatically improve skills on updates
  optimization_report: true  # Create optimization reports
```

#### 8. Documentation Updates
- Update `CLAUDE.md` with new commands documentation
- Add "Advanced Orchestration" section
- Add "Workflow System" section
- Document when to use `/execute-tasks` vs. `/orchestrate-tasks`
- Document workflow reference syntax
- Add examples of workflow composition

---

### Out of Scope

#### Will NOT Be Implemented
1. **Two-step spec creation** (`/shape-spec` + `/write-spec`) - Decided to keep only `/create-spec` (comprehensive single-step)
2. **Folder structure change** - Will NOT switch to `yoyo-dev/` naming
3. **Breaking changes to existing commands** - All current commands remain unchanged
4. **Automatic skills improvement** - Will NOT auto-modify skills without user approval
5. **Replacement of `/execute-tasks`** - Will remain the default execution method
6. **Migration of existing projects** - No changes to existing `.yoyo-dev/` structures

#### Deferred to Future Versions
1. **Alternative folder structure support** - Config option for `yoyo-dev/` compatibility
2. **Orchestration templates** - Pre-built orchestration.yml templates for common scenarios
3. **Workflow marketplace** - Sharing and discovering community workflows
4. **Workflow validation** - Automated testing of workflow compositions

---

## Requirements

### Functional Requirements

#### FR1: Workflow System
- **FR1.1** - Copy `workflows/` directory to `/home/yoga999/PROJECTS/yoyo-dev/workflows/`
- **FR1.2** - Preserve directory structure: `planning/`, `specification/`, `implementation/`
- **FR1.3** - Agents can reference workflows using `{{workflows/path/to/workflow.md}}` syntax
- **FR1.4** - Workflow content is expanded inline when agent is executed
- **FR1.5** - Workflows can reference other workflows (nested composition)

#### FR2: New Agents
- **FR2.1** - Add 7 new agent files to `.yoyo-dev/claude-code/agents/`
- **FR2.2** - Each agent includes YAML frontmatter with required fields
- **FR2.3** - Each agent references appropriate workflows
- **FR2.4** - Each agent includes "When to use this agent" section
- **FR2.5** - Agents are registered in `config.yml`

#### FR3: `/orchestrate-tasks` Command
- **FR3.1** - Command entry point created in `.claude/commands/`
- **FR3.2** - Instruction file created in `.yoyo-dev/instructions/core/`
- **FR3.3** - User can select which task groups to execute
- **FR3.4** - User can assign specific agents to each task group
- **FR3.5** - User can assign standards to each task group
- **FR3.6** - Creates `orchestration.yml` file in spec directory
- **FR3.7** - Executes tasks using assigned agents in parallel where possible
- **FR3.8** - Aggregates results into orchestration report
- **FR3.9** - Follows XML instruction format with `<step>` tags

#### FR4: `/improve-skills` Command
- **FR4.1** - Command entry point created in `.claude/commands/`
- **FR4.2** - Instruction file created in `.yoyo-dev/instructions/core/`
- **FR4.3** - Scans all files in `.claude/skills/` directory
- **FR4.4** - Analyzes each skill description for clarity
- **FR4.5** - Rewrites descriptions for better discoverability
- **FR4.6** - Adds "When to use this skill" section if missing
- **FR4.7** - Improves triggering keywords
- **FR4.8** - Presents changes for user review before applying
- **FR4.9** - Creates optimization report

#### FR5: Implementation Tracking
- **FR5.1** - `/execute-tasks` accepts `--implementation-reports` flag
- **FR5.2** - When enabled, creates `implementation/` folder in spec directory
- **FR5.3** - Creates per-task-group implementation report markdown files
- **FR5.4** - Reports include: approach, decisions, files, tests, challenges, time
- **FR5.5** - Implementation reports are optional (off by default)

#### FR6: Verification Workflows
- **FR6.1** - Copy verification workflows from `workflows/implementation/verification/`
- **FR6.2** - Integrate into `post-execution-tasks.md`
- **FR6.3** - Creates `verification/` folder in spec directory
- **FR6.4** - Creates `final-verification.md` report
- **FR6.5** - Verification checks: functionality, tests, accessibility, performance, security, docs
- **FR6.6** - Verification runs before marking tasks complete

#### FR7: Configuration
- **FR7.1** - Update `config.yml` with multi-agent options
- **FR7.2** - Add workflow preferences section
- **FR7.3** - Add agent configuration section listing all agents
- **FR7.4** - Add skills optimization section
- **FR7.5** - All new features default to sensible values (off for optional features)

#### FR8: Documentation
- **FR8.1** - Update `CLAUDE.md` with new commands
- **FR8.2** - Add "Advanced Orchestration" section
- **FR8.3** - Add "Workflow System" section
- **FR8.4** - Document when to use each execution method
- **FR8.5** - Provide workflow reference syntax examples
- **FR8.6** - Include workflow composition examples

### Non-Functional Requirements

#### NFR1: Backward Compatibility
- **NFR1.1** - All existing commands work without modification
- **NFR1.2** - Existing project structures remain valid
- **NFR1.3** - No breaking changes to command interfaces
- **NFR1.4** - Existing agents continue to work without workflow references

#### NFR2: Performance
- **NFR2.1** - Workflow expansion adds < 100ms overhead
- **NFR2.2** - Nested workflow expansion limited to 3 levels deep (prevent infinite loops)
- **NFR2.3** - Implementation reports do not slow down task execution
- **NFR2.4** - Verification workflows run in parallel where possible

#### NFR3: Maintainability
- **NFR3.1** - Workflows are self-contained markdown files
- **NFR3.2** - Workflow changes automatically propagate to all referencing agents
- **NFR3.3** - Clear separation: instructions (XML) vs. workflows (markdown)
- **NFR3.4** - Workflow composition patterns documented

#### NFR4: Usability
- **NFR4.1** - Default behavior unchanged (existing users not impacted)
- **NFR4.2** - New features opt-in via flags or config
- **NFR4.3** - Clear guidance on when to use advanced features
- **NFR4.4** - Error messages explain workflow reference failures

---

## Technical Approach

### Architecture

#### Three-Layer System

**Layer 1: Commands** (Entry Points)
- Files in `.claude/commands/` that users invoke
- Simple reference files pointing to instructions
- Example: `/orchestrate-tasks` → `.yoyo-dev/instructions/core/orchestrate-tasks.md`

**Layer 2: Instructions** (Command Logic)
- Files in `.yoyo-dev/instructions/core/`
- XML-structured with `<step>` tags
- Define command workflow and subagent delegation
- Example: `orchestrate-tasks.md` contains full orchestration logic

**Layer 3: Workflows** (Reusable Components)
- Files in `workflows/` directory
- Markdown format, self-contained
- Referenced by agents using `{{workflows/path/to/workflow.md}}`
- Example: `{{workflows/implementation/implement-tasks.md}}`

#### Workflow Reference System

**Syntax:**
```yaml
# In agent file (YAML frontmatter + body)
---
name: implementer
description: Executes task implementation
tools: [Write, Read, Bash, WebFetch, Playwright, IDE]
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

**Expansion:**
When the agent is invoked, Claude Code expands workflow references inline:
1. Parse agent file
2. Find all `{{workflows/*}}` references
3. Read referenced workflow files
4. Replace references with file contents
5. Expand nested references (max 3 levels)
6. Execute agent with expanded instructions

### File Structure

#### New Files to Create

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

**New Agents:**
```
.yoyo-dev/claude-code/agents/
├── spec-initializer.md
├── spec-shaper.md
├── spec-writer.md
├── tasks-list-creator.md
├── implementer.md
├── implementation-verifier.md
└── product-planner.md
```

**New Commands:**
```
.claude/commands/
├── orchestrate-tasks.md
└── improve-skills.md
```

**New Instructions:**
```
.yoyo-dev/instructions/core/
├── orchestrate-tasks.md
└── improve-skills.md
```

#### Files to Modify

**Update Existing Agents:**
- `.yoyo-dev/claude-code/agents/product-planner.md` - Add workflow references
- `.yoyo-dev/claude-code/agents/implementer.md` - Add workflow references
- `.yoyo-dev/claude-code/agents/implementation-verifier.md` - Add workflow references
- `.yoyo-dev/claude-code/agents/spec-writer.md` - Add workflow references

**Update Instructions:**
- `.yoyo-dev/instructions/core/execute-tasks.md` - Add implementation reports support
- `.yoyo-dev/instructions/core/post-execution-tasks.md` - Add verification workflows

**Update Configuration:**
- `.yoyo-dev/config.yml` - Add multi-agent, workflows, agents, skills sections

**Update Documentation:**
- `CLAUDE.md` - Add new commands, workflow system, orchestration guide

### Implementation Strategy

#### Phase 1: Foundation (Non-Breaking)
**Goal:** Add workflow system without affecting existing commands

**Tasks:**
1. Copy `workflows/` directory structure to Yoyo Dev root
2. Verify all workflow files are valid markdown
3. Add workflow reference expansion logic to agent system
4. Test workflow expansion with simple examples
5. Document workflow syntax and composition patterns

**Validation:**
- Existing commands continue to work
- Workflow references expand correctly
- No performance degradation

---

#### Phase 2: New Agents
**Goal:** Add 7 specialized agents with workflow references

**Tasks:**
1. Create agent files with YAML frontmatter
2. Add workflow references using `{{workflows/*}}` syntax
3. Add "When to use this agent" sections
4. Register agents in `config.yml`
5. Test each agent independently

**Validation:**
- All agents can be invoked via Task tool
- Workflow references expand correctly
- Agent outputs match expected behavior

---

#### Phase 3: New Commands
**Goal:** Add `/orchestrate-tasks` and `/improve-skills` commands

**Tasks:**
1. Create command entry points in `.claude/commands/`
2. Create instruction files in `.yoyo-dev/instructions/core/`
3. Implement orchestration.yml generation
4. Implement skills optimization logic
5. Add rich terminal output formatting
6. Test both commands end-to-end

**Validation:**
- Commands can be invoked via `/command-name`
- Orchestration creates valid orchestration.yml
- Skills improvement works on sample skills
- Terminal output is well-formatted

---

#### Phase 4: Enhanced Features
**Goal:** Add implementation tracking and verification workflows

**Tasks:**
1. Add `--implementation-reports` flag to `/execute-tasks`
2. Implement `implementation/` folder creation
3. Add per-task-group report generation
4. Copy verification workflows
5. Integrate verification into post-execution
6. Create `verification/final-verification.md` template

**Validation:**
- Implementation reports created when flag enabled
- Verification runs before task completion
- Reports contain all required sections
- No impact when features disabled

---

#### Phase 5: Configuration & Documentation
**Goal:** Update config and docs for all new features

**Tasks:**
1. Update `config.yml` with all new sections
2. Add default values for all options
3. Update `CLAUDE.md` with comprehensive documentation
4. Add "Advanced Orchestration" section
5. Add "Workflow System" section
6. Provide examples and use case guidance

**Validation:**
- Config file valid YAML
- All options documented
- Examples work correctly
- Clear guidance on feature usage

---

#### Phase 6: Integration Testing
**Goal:** Verify all features work together

**Tasks:**
1. Test existing commands (no regression)
2. Test new commands independently
3. Test workflow reference expansion
4. Test orchestration with multiple agents
5. Test implementation reports + verification
6. Test skills improvement on real skills

**Validation:**
- No breaking changes
- All new features work as specified
- Performance acceptable
- Documentation accurate

---

## Deliverables

### Code Deliverables
1. **Workflows Directory** - `workflows/` with all planning, specification, and implementation workflows
2. **7 New Agents** - All agent files in `.yoyo-dev/claude-code/agents/`
3. **2 New Commands** - Entry points and instructions for `/orchestrate-tasks` and `/improve-skills`
4. **Enhanced Agents** - Updated existing agents with workflow references
5. **Updated Instructions** - Modified `execute-tasks.md` and `post-execution-tasks.md`
6. **Updated Configuration** - Enhanced `config.yml` with new options
7. **Updated Documentation** - Comprehensive `CLAUDE.md` updates

### Documentation Deliverables
1. **Integration Guide** - How workflow system works and how to use it
2. **Orchestration Guide** - When and how to use `/orchestrate-tasks`
3. **Workflow Composition Guide** - How to build workflows and compose them
4. **Agent Development Guide** - How to create agents with workflow references
5. **Migration Guide** - How existing projects benefit from new features (no migration needed)

### Testing Deliverables
1. **Workflow Expansion Tests** - Verify workflow references expand correctly
2. **Agent Tests** - Test all 7 new agents
3. **Command Tests** - End-to-end tests for new commands
4. **Regression Tests** - Ensure existing commands work unchanged
5. **Integration Tests** - Test features working together

---

## Success Criteria

### Must Have (P0)
- ✅ All existing Yoyo Dev commands work without modification
- ✅ Workflow system functional with `{{workflows/*}}` syntax
- ✅ All 7 new agents working and registered
- ✅ `/orchestrate-tasks` command fully functional
- ✅ `/improve-skills` command fully functional
- ✅ Configuration updated and valid
- ✅ Documentation comprehensive and accurate

### Should Have (P1)
- ✅ Implementation reports feature working
- ✅ Verification workflows integrated
- ✅ Enhanced agents using workflow references
- ✅ Orchestration.yml generation working
- ✅ Skills optimization working on real skills
- ✅ No performance degradation
- ✅ Rich terminal output for new commands

### Nice to Have (P2)
- ⭕ Workflow composition examples in docs
- ⭕ Sample orchestration.yml templates
- ⭕ Agent development guide
- ⭕ Video walkthrough of new features
- ⭕ Community workflow contribution guide

---

## Risks & Mitigation

### Risk 1: Workflow Reference Complexity
**Risk:** Nested workflow references could create infinite loops or become hard to debug

**Mitigation:**
- Limit nesting to 3 levels maximum
- Add cycle detection during expansion
- Provide clear error messages for reference failures
- Log workflow expansion tree for debugging

---

### Risk 2: Performance Overhead
**Risk:** Workflow expansion and implementation reports could slow down execution

**Mitigation:**
- Cache expanded workflows in memory
- Make implementation reports optional (off by default)
- Run verification workflows in parallel
- Profile and optimize expansion algorithm

---

### Risk 3: User Confusion
**Risk:** Too many execution options (execute-tasks vs. orchestrate-tasks) could confuse users

**Mitigation:**
- Keep `/execute-tasks` as clear default
- Document specific use cases for `/orchestrate-tasks`
- Provide decision tree in docs: "Which command should I use?"
- Make advanced features clearly marked as "advanced"

---

### Risk 4: Workflow Maintainability
**Risk:** Workflow files could become scattered and hard to maintain

**Mitigation:**
- Enforce clear directory structure
- Require workflows to be self-contained
- Document workflow composition patterns
- Create workflow index/catalog in docs

---

### Risk 5: Breaking Agent Changes
**Risk:** Updating agents with workflow references could break existing behavior

**Mitigation:**
- Test agents before and after updates
- Keep workflow-free fallback behavior
- Version workflows if breaking changes needed
- Comprehensive regression testing

---

## Timeline Estimate

### Phase 1: Foundation (2-3 hours)
- Copy workflows directory
- Implement workflow reference system
- Test expansion logic

### Phase 2: New Agents (3-4 hours)
- Create 7 agent files
- Add workflow references
- Test each agent

### Phase 3: New Commands (4-5 hours)
- Create `/orchestrate-tasks` command
- Create `/improve-skills` command
- Test both commands

### Phase 4: Enhanced Features (3-4 hours)
- Add implementation reports
- Integrate verification workflows
- Test enhanced features

### Phase 5: Configuration & Documentation (2-3 hours)
- Update config.yml
- Update CLAUDE.md
- Create guides

### Phase 6: Integration Testing (2-3 hours)
- Regression testing
- Integration testing
- Bug fixes

**Total Estimate: 16-22 hours**

---

## Open Questions

1. **Workflow Versioning:** Should workflows be versioned? If so, how?
2. **Workflow Marketplace:** Future plans for sharing community workflows?
3. **Orchestration Templates:** Should we provide pre-built orchestration.yml templates?
4. **Alternative Folder Structure:** Should we add config option for `yoyo-dev/` compatibility in future?
5. **Workflow Testing:** Should we create automated tests for workflow compositions?

---

## Appendix

### Example: Workflow Reference Expansion

**Agent File (Before Expansion):**
```yaml
---
name: implementer
description: Executes task implementation
tools: [Write, Read, Bash]
---

# Implementer Agent

{{workflows/implementation/implement-tasks.md}}
```

**Agent File (After Expansion):**
```yaml
---
name: implementer
description: Executes task implementation
tools: [Write, Read, Bash]
---

# Implementer Agent

[FULL CONTENT OF implement-tasks.md INSERTED HERE]

You are specialized in implementing tasks...
Follow TDD approach...
Create tests first...
[etc.]
```

### Example: Orchestration.yml

```yaml
# Orchestration Roadmap
# Created: 2025-10-30
# Spec: user-profile-feature

orchestration:
  spec_folder: .yoyo-dev/specs/2025-10-30-user-profile-feature
  task_groups:
    - group_number: 1
      group_name: Database Schema
      agent: implementer
      standards:
        - best-practices.md
        - code-style/typescript.md
      status: pending

    - group_number: 2
      group_name: API Endpoints
      agent: implementer
      standards:
        - best-practices.md
        - code-style/typescript.md
      status: pending

    - group_number: 3
      group_name: Frontend Components
      agent: implementer
      standards:
        - best-practices.md
        - code-style/react.md
        - design-system.md
      status: pending

    - group_number: 4
      group_name: Testing
      agent: implementer
      standards:
        - best-practices.md
        - code-style/testing.md
      status: pending

execution:
  parallel_groups:
    - [1]  # Database first
    - [2]  # API second (depends on database)
    - [3]  # Frontend third (depends on API)
    - [4]  # Tests last (depends on all)
```

### Example: Implementation Report

```markdown
# Implementation Report: Task Group 1 - Database Schema

**Task Group:** 1
**Name:** Database Schema
**Date:** 2025-10-30
**Agent:** implementer
**Status:** ✅ Completed

---

## Implementation Approach

Used Convex schema definition with TypeScript types. Created migration for profiles table with proper indexes.

**Key Decisions:**
- Used `v.id("users")` for user references (Convex best practice)
- Added compound index on `(userId, createdAt)` for efficient queries
- Used `v.optional()` for nullable fields

---

## Files Created

- `convex/schema.ts` (modified) - Added profiles table
- `convex/migrations/001_profiles.ts` - Migration file
- `convex/profiles.test.ts` - Schema tests

---

## Files Modified

- `convex/schema.ts` - Added profiles table definition

---

## Tests Added

1. `profiles.test.ts::should create profile with valid data`
2. `profiles.test.ts::should enforce required fields`
3. `profiles.test.ts::should validate userId reference`

**Coverage:** 100% of schema definition

---

## Challenges Encountered

None. Straightforward schema implementation.

---

## Time Estimate

**Estimated:** 30 minutes
**Actual:** 25 minutes
**Variance:** -5 minutes (faster than expected)

---

## Notes

Schema follows Convex best practices. All tests passing. Ready for API implementation (Task Group 2).
```

---

## Related Documents

- **Command Flows:** `commands/orchestrate-tasks/`, `commands/improve-skills/`
- **Workflows:** `workflows/planning/`, `workflows/specification/`, `workflows/implementation/`
- **Existing Instructions:** `.yoyo-dev/instructions/core/`
- **Existing Agents:** `.yoyo-dev/claude-code/agents/`
- **Configuration:** `.yoyo-dev/config.yml`
- **Documentation:** `CLAUDE.md`
