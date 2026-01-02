# Technical Decisions: Command Flows & Workflows Integration

**Created:** 2025-10-30
**Spec:** command-workflow-integration

---

## Decision Log

### Decision 1: Folder Structure

**Date:** 2025-10-30
**Decision:** Keep `.yoyo-dev/` folder structure as default

**Context:**
- New command flows use `yoyo-dev/` prefix
- Yoyo Dev uses `.yoyo-dev/` prefix
- Need to decide on single standard or support both

**Options Considered:**
1. Keep `.yoyo-dev/` (current Yoyo Dev standard)
2. Switch to `yoyo-dev/` (align with new commands)
3. Support both with config option

**Decision:**
Option 1 - Keep `.yoyo-dev/` as default

**Rationale:**
- No migration needed for existing projects
- Maintains consistency with established Yoyo Dev conventions
- Hidden folder (`.yoyo-dev/`) keeps project root clean
- Future option to support `yoyo-dev/` via config if needed

**Impact:**
- New workflows and agents will reference `.yoyo-dev/` paths
- No breaking changes to existing projects
- Future-proofed with config option possibility

---

### Decision 2: Spec Creation Workflow

**Date:** 2025-10-30
**Decision:** Keep `/create-spec` as comprehensive single-step workflow

**Context:**
- New commands offer two-step approach: `/shape-spec` (requirements) → `/write-spec` (spec document)
- Yoyo Dev has single-step `/create-spec` (requirements + spec + decisions + sub-specs)
- Need to decide which approach to use

**Options Considered:**
1. Keep `/create-spec` only (comprehensive, fast)
2. Replace with `/shape-spec` + `/write-spec` (iterative)
3. Offer both workflows (user choice)

**Decision:**
Option 1 - Keep `/create-spec` only

**Rationale:**
- Faster workflow (one command vs. two)
- Less cognitive overhead for users
- Produces comprehensive spec suite in one go
- User explicitly chose this option in requirements gathering
- Two-step approach adds complexity without clear benefit for most use cases

**Impact:**
- `/shape-spec` and `/write-spec` will NOT be integrated
- `spec-shaper` and `spec-writer` agents will still be added (can be used independently via Task tool if needed)
- Workflows from `workflows/specification/` can be referenced by agents for future enhancements

**Future Consideration:**
- If user feedback shows demand for iterative spec creation, can add two-step workflow in future version

---

### Decision 3: Task Execution Workflow

**Date:** 2025-10-30
**Decision:** Keep `/execute-tasks` as default, add `/orchestrate-tasks` for advanced users

**Context:**
- Yoyo Dev has `/execute-tasks` with automatic parallel execution and comprehensive post-execution
- New commands offer `/implement-tasks` (simpler) and `/orchestrate-tasks` (manual multi-agent control)
- Need to decide primary execution method

**Options Considered:**
1. Keep `/execute-tasks` only (automatic, comprehensive)
2. Replace with `/implement-tasks` + `/orchestrate-tasks`
3. Offer both workflows

**Decision:**
Option 3 - Keep `/execute-tasks` as default, add `/orchestrate-tasks` as advanced alternative

**Rationale:**
- `/execute-tasks` is proven, comprehensive, and automatic (best for most cases)
- `/orchestrate-tasks` provides fine-grained control for complex multi-agent scenarios
- User explicitly chose this option in requirements gathering
- Provides escape hatch for power users without compromising simplicity for regular users

**Impact:**
- `/execute-tasks` remains primary execution method (documented first, recommended for most cases)
- `/orchestrate-tasks` added for advanced users (clearly marked as "advanced" in docs)
- Documentation will include decision tree: "When to use which command?"

**Usage Guidance:**
- Use `/execute-tasks` for: Normal features, standard workflows, automatic parallel execution
- Use `/orchestrate-tasks` for: Complex multi-agent scenarios, manual agent assignment, custom orchestration

---

### Decision 4: Workflow Reference System

**Date:** 2025-10-30
**Decision:** Use `{{workflows/path/to/workflow.md}}` syntax for workflow references in agents

**Context:**
- Need standardized way for agents to reference reusable workflow components
- Must be simple, readable, and prevent naming collisions

**Options Considered:**
1. `{{workflows/path/to/workflow.md}}` (explicit path)
2. `@workflows/path/to/workflow` (shorthand)
3. `#include workflows/path/to/workflow.md` (C-style)
4. `{% include workflows/path/to/workflow.md %}` (Jinja-style)

**Decision:**
Option 1 - `{{workflows/path/to/workflow.md}}`

**Rationale:**
- Double curly braces familiar from templating systems (Handlebars, Mustache)
- Explicit `.md` extension makes file type clear
- Full path prevents ambiguity
- Easy to search/grep for workflow references
- Visually distinct from XML tags used in instructions

**Implementation Details:**
- Regex pattern: `\{\{workflows/([\w/\-]+\.md)\}\}`
- Expansion happens when agent is invoked via Task tool
- Max nesting depth: 3 levels
- Cycle detection prevents infinite loops

**Impact:**
- All new agents use this syntax
- Existing agents can be updated incrementally (not required)
- Clear, searchable workflow references throughout codebase

---

### Decision 5: Agent Frontmatter Format

**Date:** 2025-10-30
**Decision:** Use YAML frontmatter for agent metadata

**Context:**
- Agents need structured metadata (name, description, tools, color, model)
- Must be machine-readable and human-readable

**Options Considered:**
1. YAML frontmatter (Jekyll/Hugo-style)
2. JSON frontmatter
3. XML metadata section
4. Plain markdown with structured comments

**Decision:**
Option 1 - YAML frontmatter

**Rationale:**
- Already used by some existing agents (consistency)
- Human-readable and easy to edit
- Standard format in static site generators
- Well-supported by markdown parsers
- Less verbose than XML or JSON

**Format:**
```yaml
---
name: agent-name
description: One-line description
tools: [Read, Write, Bash, WebFetch]
color: blue  # optional
model: sonnet  # haiku|sonnet|opus
---
```

**Impact:**
- All 7 new agents use YAML frontmatter
- Existing agents without frontmatter can be updated incrementally
- Frontmatter is optional (agents work without it, but it's recommended)

---

### Decision 6: Implementation Tracking

**Date:** 2025-10-30
**Decision:** Make implementation reports optional (off by default), enabled via `--implementation-reports` flag

**Context:**
- Implementation reports provide detailed task-level documentation
- Could add overhead for simple tasks
- Need to balance thoroughness with speed

**Options Considered:**
1. Always create implementation reports
2. Never create implementation reports
3. Optional via flag (off by default)
4. Optional via config (on by default)

**Decision:**
Option 3 - Optional via `--implementation-reports` flag, off by default

**Rationale:**
- Most tasks don't need detailed implementation reports
- Power users and complex projects benefit from tracking
- Flag-based approach gives per-execution control
- Off by default keeps standard workflow fast
- User can always add flag when needed

**Usage:**
```bash
/execute-tasks                        # Normal (no reports)
/execute-tasks --implementation-reports  # Create detailed reports
```

**Impact:**
- No overhead for standard workflow
- Implementation tracking available when needed
- Clear opt-in model

---

### Decision 7: Verification Workflows

**Date:** 2025-10-30
**Decision:** Enable verification workflows by default in post-execution phase

**Context:**
- Verification workflows check functionality, tests, accessibility, performance, security, docs
- Could add time to execution
- High value for quality assurance

**Options Considered:**
1. Always run verification (enabled by default)
2. Optional via flag (off by default)
3. Optional via config (user chooses default)

**Decision:**
Option 1 - Always run verification (enabled by default)

**Rationale:**
- Quality gates should be default, not opt-in
- Verification catches issues before PR creation
- Prevents shipping broken or inaccessible features
- Time cost is acceptable (< 5s with parallel execution)
- Can be disabled via `--no-verification` flag if really needed

**Verification Checks:**
1. Functionality verification (features work as specified)
2. Test coverage verification (tests pass, adequate coverage)
3. Accessibility verification (WCAG AA compliance)
4. Performance verification (no regressions, meets budgets)
5. Security verification (no vulnerabilities)
6. Documentation verification (docs current)

**Impact:**
- Higher quality output by default
- Issues caught before PR creation
- Systematic quality assurance
- Minimal time overhead (parallel execution)

---

### Decision 8: New Commands to Integrate

**Date:** 2025-10-30
**Decision:** Integrate `/orchestrate-tasks` and `/improve-skills`, skip `/shape-spec` and `/write-spec`

**Context:**
- New command flows provide multiple new commands
- Need to decide which to integrate based on user priorities

**Commands Evaluated:**
1. `/shape-spec` - Gather requirements (part of two-step spec workflow)
2. `/write-spec` - Write spec document (part of two-step spec workflow)
3. `/orchestrate-tasks` - Advanced multi-agent orchestration
4. `/improve-skills` - Optimize Claude Code Skills

**Decision:**
Integrate: `/orchestrate-tasks` + `/improve-skills`
Skip: `/shape-spec` + `/write-spec`

**Rationale:**

**Integrate `/orchestrate-tasks`:**
- Provides unique value (manual multi-agent control)
- Complements `/execute-tasks` (automatic)
- User explicitly requested this feature
- No overlap with existing commands

**Integrate `/improve-skills`:**
- Completely new functionality
- No equivalent in Yoyo Dev
- High value for Claude Code users
- User explicitly requested this feature
- Straightforward implementation

**Skip `/shape-spec` + `/write-spec`:**
- User chose to keep single-step `/create-spec`
- Two-step workflow adds complexity
- Overlaps with existing `/create-spec`
- Agents (`spec-shaper`, `spec-writer`) still added for potential future use

**Impact:**
- Two new commands: `/orchestrate-tasks` and `/improve-skills`
- Clear value proposition for both
- No redundancy with existing commands

---

### Decision 9: Workflow Nesting Limit

**Date:** 2025-10-30
**Decision:** Limit workflow nesting to 3 levels maximum

**Context:**
- Workflows can reference other workflows
- Need to prevent infinite loops and excessive complexity
- Must balance flexibility with maintainability

**Options Considered:**
1. No nesting (workflows are atomic)
2. Max 2 levels nesting
3. Max 3 levels nesting
4. Max 5 levels nesting
5. Unlimited nesting

**Decision:**
Option 3 - Max 3 levels nesting

**Rationale:**
- 3 levels sufficient for most composition patterns
- Example: Agent → Workflow A → Workflow B → Workflow C (3 levels)
- Deeper nesting indicates over-complicated design
- Easier to debug with limited depth
- Prevents accidentally creating deeply nested chains

**Implementation:**
- Track depth during expansion
- Throw error if depth > 3
- Clear error message with reference chain

**Impact:**
- Workflows can be composed up to 3 levels deep
- Forces simpler, more maintainable workflow structures
- Prevents performance issues from deep recursion

---

### Decision 10: Features from New Commands to Integrate

**Date:** 2025-10-30
**Decision:** Integrate all four requested features

**Context:**
- User selected which features from new commands to integrate
- Need to implement all selected features

**Features Selected:**
1. `/improve-skills` command
2. Implementation reports (`implementation/` folder)
3. Verification workflows
4. Workflow-based agent system

**Decision:**
Integrate all four features as requested

**Implementation Plan:**

**Feature 1: `/improve-skills` command**
- Create command entry point and instruction file
- Implement skills scanning, analysis, optimization, preview, and reporting
- Add to CLAUDE.md documentation

**Feature 2: Implementation reports**
- Add `--implementation-reports` flag to `/execute-tasks`
- Create `implementation/` folder structure
- Generate per-task-group reports with approach, decisions, files, tests, challenges, time
- Optional (off by default)

**Feature 3: Verification workflows**
- Copy verification workflows from `workflows/implementation/verification/`
- Integrate into `post-execution-tasks.md`
- Create `verification/final-verification.md` report
- Check: functionality, tests, accessibility, performance, security, docs
- Enabled by default

**Feature 4: Workflow-based agent system**
- Copy `workflows/` directory to Yoyo Dev root
- Implement `{{workflows/*}}` reference expansion system
- Update agents to use workflow references
- Document workflow composition patterns

**Impact:**
- Comprehensive integration of new capabilities
- Modular, maintainable agent system
- Optional implementation tracking
- Systematic verification
- Skills optimization tooling

---

### Decision 11: Configuration Structure

**Date:** 2025-10-30
**Decision:** Extend `config.yml` with new sections, use sensible defaults

**Context:**
- New features require configuration options
- Must maintain backward compatibility
- Should provide clear defaults

**Configuration Added:**
```yaml
multi_agent:
  enabled: true
  use_workflow_references: true

workflows:
  task_execution:
    mode: automatic  # automatic or orchestrated
    implementation_reports: false  # off by default
    verification_reports: true     # on by default

agents:
  # New agents (all enabled)
  spec_initializer: true
  spec_shaper: true
  spec_writer: true
  tasks_list_creator: true
  implementer: true
  implementation_verifier: true
  product_planner: true

skills:
  auto_improve: false  # don't auto-modify without approval
  optimization_report: true  # create reports

workflow_system:
  max_nesting_depth: 3
  cache_enabled: true
  cache_size: 100
```

**Defaults Rationale:**
- `use_workflow_references: true` - Enable new system
- `mode: automatic` - `/execute-tasks` is default
- `implementation_reports: false` - Opt-in for advanced users
- `verification_reports: true` - Quality gates on by default
- `auto_improve: false` - Require user approval for skill changes
- `max_nesting_depth: 3` - Prevent over-complexity
- `cache_enabled: true` - Performance optimization

**Impact:**
- Clear configuration structure
- Sensible defaults (no tuning required)
- Easy to understand and modify
- Backward compatible (new sections don't break existing config)

---

### Decision 12: Documentation Approach

**Date:** 2025-10-30
**Decision:** Update CLAUDE.md with comprehensive documentation, including when to use each workflow

**Context:**
- Multiple execution workflows (execute-tasks vs. orchestrate-tasks)
- Need clear guidance on when to use each
- Must prevent user confusion

**Documentation Structure:**

**1. Core Commands Section**
- List all commands with brief descriptions
- Mark advanced commands clearly

**2. Advanced Orchestration Section** (NEW)
- When to use `/orchestrate-tasks`
- Example scenarios
- Orchestration.yml format
- Best practices

**3. Workflow System Section** (NEW)
- How workflow references work
- Workflow composition patterns
- Available workflows
- Creating custom workflows

**4. Decision Trees**
- "Which execution method should I use?"
  - Use `/execute-tasks` for: normal features, automatic execution
  - Use `/orchestrate-tasks` for: complex scenarios, manual control

**Impact:**
- Clear guidance for users
- Reduced confusion between similar commands
- Examples for all new features
- Easy to understand and follow

---

## Architecture Decisions

### AD-1: Three-Layer Architecture

**Decision:** Maintain three-layer separation: Commands → Instructions → Agents/Workflows

**Rationale:**
- Clear separation of concerns
- Commands are entry points (simple references)
- Instructions contain command logic (XML-structured)
- Agents/Workflows are reusable components

**Benefit:**
- Easy to maintain and update
- Clear file organization
- Reusability of workflows across agents

---

### AD-2: XML Instructions Format

**Decision:** Keep XML-structured instructions for commands, use markdown for workflows

**Rationale:**
- XML provides structure (`<step>`, `<action>`, subagent delegation)
- Markdown is simpler for reusable workflow components
- Hybrid approach leverages strengths of both

**Benefit:**
- Structured command workflows
- Simple, readable workflow components
- Clear distinction between command logic and reusable workflows

---

### AD-3: Workflow Caching

**Decision:** Implement in-memory caching of expanded workflows with file modification tracking

**Rationale:**
- Workflow expansion has overhead
- Same workflows referenced multiple times
- Cache invalidation needed when files change

**Implementation:**
- Cache key: file path + modification time
- Max cache size: 100 workflows
- Invalidate on file modification

**Benefit:**
- < 100ms expansion overhead
- Improved performance for repeated agent calls
- Automatic cache invalidation

---

## Open Questions

### OQ-1: Workflow Versioning

**Question:** Should workflows be versioned? If so, how?

**Context:**
- Workflows may evolve over time
- Breaking changes could affect agents referencing them
- Need to decide on versioning strategy

**Options:**
1. No versioning (always use latest)
2. Semantic versioning in workflow filenames (workflow-v1.md, workflow-v2.md)
3. Version directory structure (workflows/v1/, workflows/v2/)
4. Git-based versioning (rely on version control)

**Current Decision:** Deferred to future version

**Recommendation:** Start with no versioning (option 1), add versioning if breaking changes become problematic

---

### OQ-2: Workflow Marketplace

**Question:** Should we create a marketplace for sharing community workflows?

**Context:**
- Workflows are reusable
- Community could benefit from sharing workflows
- Need infrastructure for discovery, rating, etc.

**Current Decision:** Deferred to future version

**Recommendation:** Focus on core integration first, evaluate marketplace based on community demand

---

### OQ-3: Orchestration Templates

**Question:** Should we provide pre-built orchestration.yml templates for common scenarios?

**Context:**
- `/orchestrate-tasks` requires user to assign agents and standards
- Common patterns could be templated
- Examples: "Full-stack feature", "API-only", "Frontend-only", etc.

**Current Decision:** Deferred to future version

**Recommendation:** Gather user feedback on orchestration usage patterns, then create templates for common scenarios

---

### OQ-4: Alternative Folder Structure Support

**Question:** Should we add config option to support `yoyo-dev/` folder structure in addition to `.yoyo-dev/`?

**Context:**
- New commands use `yoyo-dev/`
- Some users may prefer this naming
- Would require config option and path mapping

**Current Decision:** Deferred to future version

**Recommendation:** Evaluate user demand before adding complexity of dual folder structure support

---

### OQ-5: Workflow Testing

**Question:** Should we create automated tests for workflow compositions?

**Context:**
- Workflows can reference other workflows
- Complex compositions could break
- Testing workflow expansion and execution would be valuable

**Current Decision:** Out of scope for initial integration

**Recommendation:** Add workflow testing in future version after initial stabilization

---

## Risks and Mitigations

See main spec.md for comprehensive risk analysis and mitigation strategies.

Key risks:
1. Workflow reference complexity → Max 3 nesting levels, cycle detection
2. Performance overhead → Caching, optional features off by default
3. User confusion → Clear documentation, decision trees
4. Workflow maintainability → Self-contained files, clear structure
5. Breaking agent changes → Comprehensive testing, fallback behavior

---

## References

- Main Spec: `spec.md`
- Technical Spec: `sub-specs/technical-spec.md`
- Lite Spec: `spec-lite.md`
- Command Flows: `commands/` directory
- Workflows: `workflows/` directory
- Configuration: `.yoyo-dev/config.yml`
