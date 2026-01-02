# Technical Specification: Command Flows & Workflows Integration

**Created:** 2025-10-30
**Spec:** command-workflow-integration

---

## Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: COMMANDS                        │
│  Entry points in .claude/commands/                          │
│  - orchestrate-tasks.md                                     │
│  - improve-skills.md                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   LAYER 2: INSTRUCTIONS                     │
│  Command logic in .yoyo-dev/instructions/core/              │
│  - XML-structured with <step> tags                          │
│  - Subagent delegation via subagent="" attribute            │
│  - orchestrate-tasks.md                                     │
│  - improve-skills.md                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 3: AGENTS                          │
│  Specialized agents in .yoyo-dev/claude-code/agents/        │
│  - YAML frontmatter + markdown body                         │
│  - Reference workflows using {{workflows/*}}                │
│  - spec-initializer, spec-shaper, spec-writer, etc.         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   LAYER 4: WORKFLOWS                        │
│  Reusable components in workflows/                          │
│  - planning/, specification/, implementation/               │
│  - Self-contained markdown files                            │
│  - Can reference other workflows (max 3 levels)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Workflow Reference System

### Syntax Design

**In Agent Files:**
```yaml
---
name: agent-name
description: Agent description
tools: [Tool1, Tool2]
color: blue
model: sonnet
---

# Agent Name

You are a specialized agent that does X.

## Workflow

{{workflows/category/workflow-name.md}}

## Additional Instructions

When executing this workflow:
- Follow best practices
- Check standards
```

### Expansion Algorithm

```python
def expand_workflow_references(agent_content: str, visited: set = None, depth: int = 0) -> str:
    """
    Expand workflow references in agent content.

    Args:
        agent_content: Raw agent file content
        visited: Set of already-visited workflow paths (cycle detection)
        depth: Current nesting depth (max 3)

    Returns:
        Expanded content with all references replaced
    """
    if visited is None:
        visited = set()

    if depth > 3:
        raise WorkflowExpansionError("Maximum nesting depth (3) exceeded")

    # Find all {{workflows/*}} references
    pattern = r'\{\{workflows/([\w/\-]+\.md)\}\}'
    references = re.findall(pattern, agent_content)

    for ref_path in references:
        full_path = f"workflows/{ref_path}"

        # Cycle detection
        if full_path in visited:
            raise WorkflowExpansionError(f"Circular reference detected: {full_path}")

        visited.add(full_path)

        # Read workflow file
        try:
            workflow_content = read_file(full_path)
        except FileNotFoundError:
            raise WorkflowExpansionError(f"Workflow not found: {full_path}")

        # Recursively expand nested references
        expanded_content = expand_workflow_references(
            workflow_content,
            visited.copy(),
            depth + 1
        )

        # Replace reference with expanded content
        agent_content = agent_content.replace(
            f"{{{{workflows/{ref_path}}}}}",
            expanded_content
        )

    return agent_content
```

### Performance Optimization

**Caching Strategy:**
- Cache expanded workflows in memory during session
- Cache key: workflow file path + modification timestamp
- Invalidate cache on file modification
- Max cache size: 100 workflows

```python
workflow_cache: Dict[str, Tuple[str, float]] = {}

def get_expanded_workflow(path: str) -> str:
    mtime = os.path.getmtime(path)

    if path in workflow_cache:
        cached_content, cached_mtime = workflow_cache[path]
        if cached_mtime == mtime:
            return cached_content

    # Not cached or outdated - expand
    content = read_file(path)
    expanded = expand_workflow_references(content)

    workflow_cache[path] = (expanded, mtime)
    return expanded
```

---

## Agent System

### Agent File Structure

**YAML Frontmatter (Required):**
```yaml
---
name: agent-name               # Unique identifier
description: One-line desc     # For Task tool selection
tools:                         # Available tools
  - Read
  - Write
  - Bash
  - WebFetch
color: blue                    # UI color (optional)
model: sonnet                  # haiku|sonnet|opus
---
```

**Markdown Body:**
```markdown
# Agent Name

You are a specialized agent that [purpose].

## Workflow

{{workflows/category/workflow-name.md}}

## Standards Compliance

When executing tasks, follow these standards:
- `.yoyo-dev/standards/best-practices.md`
- `.yoyo-dev/standards/tech-stack.md`

## When to Use This Agent

Use this agent when:
- [Use case 1]
- [Use case 2]
- [Use case 3]

## Examples

[Example usage scenarios]
```

### New Agents to Create

#### 1. spec-initializer.md

```yaml
---
name: spec-initializer
description: Initialize spec folder structure and state tracking
tools:
  - Write
  - Bash
color: blue
model: haiku
---

# Spec Initializer Agent

You are specialized in initializing specification folder structures.

## Workflow

{{workflows/specification/initialize-spec.md}}

## Standards Compliance

When creating spec structures, follow:
- `.yoyo-dev/standards/best-practices.md` (folder naming conventions)

## When to Use This Agent

Use this agent when:
- Starting a new feature specification
- Need to create spec folder structure
- Need to initialize state.json tracking file
```

#### 2. spec-shaper.md

```yaml
---
name: spec-shaper
description: Gather detailed requirements through targeted questions and visual analysis
tools:
  - Write
  - Read
  - Bash
  - WebFetch
color: purple
model: sonnet
---

# Spec Shaper Agent

You are specialized in gathering requirements through targeted questioning.

## Workflow

{{workflows/specification/research-spec.md}}

## Standards Compliance

When gathering requirements:
- Ask clarifying questions about ambiguous requirements
- Visual analysis for UI features
- Document assumptions in planning/requirements.md

## When to Use This Agent

Use this agent when:
- Need to gather requirements for a spec
- Clarifying ambiguous feature requests
- Researching user needs before spec writing
```

#### 3. spec-writer.md

```yaml
---
name: spec-writer
description: Create comprehensive specification documents with technical details
tools:
  - Write
  - Read
  - Bash
  - WebFetch
color: blue
model: sonnet
---

# Spec Writer Agent

You are specialized in creating comprehensive specification documents.

## Workflow

{{workflows/specification/write-spec.md}}

## Standards Compliance

When writing specs, follow:
- `.yoyo-dev/standards/best-practices.md`
- `.yoyo-dev/standards/tech-stack.md`
- Include all required sections: Overview, Goals, User Stories, Requirements, Technical Approach

## When to Use This Agent

Use this agent when:
- Creating detailed feature specifications
- Documenting technical architecture
- Writing comprehensive requirements documents
```

#### 4. tasks-list-creator.md

```yaml
---
name: tasks-list-creator
description: Create detailed and strategic task lists for development
tools:
  - Write
  - Read
  - Bash
  - WebFetch
color: yellow
model: sonnet
---

# Tasks List Creator Agent

You are specialized in breaking down specifications into actionable tasks.

## Workflow

{{workflows/implementation/create-tasks-list.md}}

## Standards Compliance

When creating task lists:
- `.yoyo-dev/standards/best-practices.md` (TDD approach)
- `.yoyo-dev/standards/parallel-execution.md` (task metadata)
- Group by specialization (database, API, frontend, testing)
- Include task metadata: Dependencies, Files to Create/Modify, Parallel Safe

## When to Use This Agent

Use this agent when:
- Breaking down specs into tasks
- Creating implementation roadmaps
- Planning parallel execution strategy
```

#### 5. implementer.md

```yaml
---
name: implementer
description: Execute task implementation following TDD principles
tools:
  - Write
  - Read
  - Bash
  - WebFetch
  - mcp__playwright__*
  - mcp__ide__*
color: green
model: sonnet
---

# Implementer Agent

You are specialized in implementing tasks following TDD principles.

## Workflow

{{workflows/implementation/implement-tasks.md}}

## Standards Compliance

When implementing tasks:
- `.yoyo-dev/standards/best-practices.md`
- `.yoyo-dev/standards/tech-stack.md`
- Language-specific code style guides
- Design system (for UI components)

**TDD Approach:**
1. Write tests first
2. Implement to make tests pass
3. Refactor if needed
4. Verify all tests pass

## When to Use This Agent

Use this agent when:
- Implementing feature tasks
- Following TDD workflow
- Need specialized implementation expertise
- Creating implementation reports
```

#### 6. implementation-verifier.md

```yaml
---
name: implementation-verifier
description: Verify implementation completeness and quality
tools:
  - Write
  - Read
  - Bash
  - WebFetch
  - mcp__playwright__*
  - mcp__ide__*
color: orange
model: sonnet
---

# Implementation Verifier Agent

You are specialized in verifying implementation completeness.

## Workflow

{{workflows/implementation/verification/verify-functionality.md}}
{{workflows/implementation/verification/verify-tests.md}}
{{workflows/implementation/verification/verify-accessibility.md}}
{{workflows/implementation/verification/verify-performance.md}}
{{workflows/implementation/verification/verify-security.md}}
{{workflows/implementation/verification/verify-documentation.md}}

## Verification Checklist

**Functionality:**
- All features work as specified
- All acceptance criteria met
- No critical bugs

**Tests:**
- All tests pass
- Adequate coverage (>80%)
- Tests cover edge cases

**Accessibility:**
- WCAG AA compliance
- Focus states present
- ARIA labels correct
- Keyboard navigation works

**Performance:**
- No performance regressions
- Meets performance budgets
- No memory leaks

**Security:**
- No security vulnerabilities
- Input validation present
- Auth/authz correct

**Documentation:**
- Code documented
- README updated
- API docs current

## When to Use This Agent

Use this agent when:
- Verifying implementation before marking tasks complete
- Pre-PR quality checks
- Final verification before deployment
```

#### 7. product-planner.md

```yaml
---
name: product-planner
description: Create product documentation including mission and roadmap
tools:
  - Write
  - Read
  - Bash
  - WebFetch
color: purple
model: sonnet
---

# Product Planner Agent

You are specialized in creating product documentation.

## Workflow

{{workflows/planning/gather-product-info.md}}
{{workflows/planning/create-product-mission.md}}
{{workflows/planning/create-product-roadmap.md}}
{{workflows/planning/create-product-tech-stack.md}}

## Standards Compliance

When creating product docs:
- `.yoyo-dev/standards/tech-stack.md` (default stack)
- Clear mission statement
- Phased roadmap structure
- Comprehensive tech stack documentation

## When to Use This Agent

Use this agent when:
- Planning new products
- Creating product documentation
- Analyzing existing products (with /analyze-product)
```

---

## Command Implementations

### `/orchestrate-tasks` Command

**Entry Point:** `.claude/commands/orchestrate-tasks.md`
```markdown
# Orchestrate Tasks

Advanced orchestration for complex multi-agent task execution.

Refer to the instructions located in this file:
@.yoyo-dev/instructions/core/orchestrate-tasks.md
```

**Instruction File:** `.yoyo-dev/instructions/core/orchestrate-tasks.md`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<command name="orchestrate-tasks">
  <metadata>
    <version>1.0.0</version>
    <created>2025-10-30</created>
    <description>Advanced orchestration for complex multi-agent scenarios</description>
  </metadata>

  <pre_flight_check>
    <check name="spec_folder_exists">
      Verify spec folder exists with tasks.md file
    </check>
    <check name="agents_available">
      Verify required agents are registered in config.yml
    </check>
    <check name="git_status_clean">
      Check git status (warn if uncommitted changes)
    </check>
  </pre_flight_check>

  <process_flow>
    <step number="1" name="task_selection">
      <description>Identify tasks to execute</description>
      <actions>
        <action>Read tasks.md from spec folder</action>
        <action>Show task groups to user</action>
        <action>Ask user which groups to execute</action>
        <action>Validate selections</action>
      </actions>
      <output>selected_task_groups</output>
    </step>

    <step number="2" name="agent_assignment">
      <description>Assign specialized agents to task groups</description>
      <actions>
        <action>For each selected task group:</action>
        <action>  - Show task group details</action>
        <action>  - List available specialized agents</action>
        <action>  - Ask user to select agent for this group</action>
        <action>Record assignments in orchestration roadmap</action>
      </actions>
      <output>task_group_agent_assignments</output>
    </step>

    <step number="3" name="standards_assignment">
      <description>Assign relevant standards to task groups</description>
      <actions>
        <action>For each selected task group:</action>
        <action>  - Show task group details</action>
        <action>  - List available standards files</action>
        <action>  - Ask user to select relevant standards (multi-select)</action>
        <action>Record standards in orchestration roadmap</action>
      </actions>
      <output>task_group_standards_assignments</output>
    </step>

    <step number="4" name="create_orchestration_file">
      <description>Create orchestration.yml file</description>
      <actions>
        <action>Create orchestration.yml in spec folder</action>
        <action>Map task groups to agents and standards</action>
        <action>Analyze dependencies for parallel execution groups</action>
        <action>Generate execution order</action>
        <action>Show orchestration plan to user</action>
        <action>Ask for confirmation before execution</action>
      </actions>
      <output>orchestration.yml file</output>
      <file_template>
        <path>spec_folder/orchestration.yml</path>
        <content>
# Orchestration Roadmap
# Created: {{date}}
# Spec: {{spec_name}}

orchestration:
  spec_folder: {{spec_folder}}
  task_groups:
    {{#each task_groups}}
    - group_number: {{number}}
      group_name: {{name}}
      agent: {{assigned_agent}}
      standards:
        {{#each standards}}
        - {{this}}
        {{/each}}
      status: pending
    {{/each}}

execution:
  parallel_groups:
    {{#each execution_groups}}
    - [{{join group_numbers}}]
    {{/each}}
        </content>
      </file_template>
    </step>

    <step number="5" subagent="implementer" name="execute_tasks">
      <description>Execute tasks using assigned agents</description>
      <instructions>
        For each parallel execution group:
        1. Use Task tool to launch assigned agents in parallel
        2. Pass task group, standards, and spec context to each agent
        3. Wait for all agents in group to complete
        4. Collect results and update orchestration.yml status
        5. Continue to next parallel group
      </instructions>
      <output>implementation_results</output>
    </step>

    <step number="6" name="create_orchestration_report">
      <description>Create orchestration report</description>
      <actions>
        <action>Aggregate results from all agents</action>
        <action>Create orchestration-report.md in spec folder</action>
        <action>Include: execution timeline, agent performance, issues encountered</action>
        <action>Show summary to user</action>
      </actions>
      <output>orchestration-report.md</output>
    </step>

    <step number="7" subagent="git-workflow" name="git_workflow">
      <description>Git commit, push, PR creation</description>
      <instructions>
        Execute standard git workflow:
        1. Run git status
        2. Add and commit changes
        3. Push to remote
        4. Create pull request
        Return PR URL
      </instructions>
      <output>pr_url</output>
    </step>

    <step number="8" subagent="project-manager" name="update_tracking">
      <description>Update task tracking and create recap</description>
      <instructions>
        1. Verify all tasks marked complete in tasks.md
        2. Update roadmap.md if applicable
        3. Create recap in .yoyo-dev/recaps/
        4. Generate completion summary with PR link
      </instructions>
      <output>completion_summary</output>
    </step>
  </process_flow>

  <post_flight_check>
    <check name="all_tasks_complete">
      Verify all selected task groups marked complete
    </check>
    <check name="tests_passing">
      Verify all tests passing
    </check>
    <check name="pr_created">
      Verify PR created successfully
    </check>
    <check name="orchestration_report_created">
      Verify orchestration report exists
    </check>
  </post_flight_check>

  <output_format>
    Use rich terminal output:
    - T1 (Command header) at start
    - T2 (Phase progress) for each step
    - T3 (Success) for completions
    - T4 (Error) for failures
    - T12 (Completion summary) at end with PR URL
  </output_format>
</command>
```

---

### `/improve-skills` Command

**Entry Point:** `.claude/commands/improve-skills.md`
```markdown
# Improve Skills

Optimize Claude Code Skills for better discoverability.

Refer to the instructions located in this file:
@.yoyo-dev/instructions/core/improve-skills.md
```

**Instruction File:** `.yoyo-dev/instructions/core/improve-skills.md`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<command name="improve-skills">
  <metadata>
    <version>1.0.0</version>
    <created>2025-10-30</created>
    <description>Optimize Claude Code Skills for better discoverability</description>
  </metadata>

  <pre_flight_check>
    <check name="skills_folder_exists">
      Verify .claude/skills/ directory exists
    </check>
    <check name="skill_files_exist">
      Verify at least one *.md file in skills directory
    </check>
  </pre_flight_check>

  <process_flow>
    <step number="1" name="scan_skills">
      <description>Scan skills directory for all skill files</description>
      <actions>
        <action>List all .md files in .claude/skills/</action>
        <action>Show count of skills found</action>
        <action>Ask user if they want to optimize all or select specific skills</action>
      </actions>
      <output>skills_to_optimize</output>
    </step>

    <step number="2" name="analyze_skills">
      <description>Analyze each skill for optimization opportunities</description>
      <actions>
        <action>For each skill file:</action>
        <action>  - Read current content</action>
        <action>  - Analyze description clarity</action>
        <action>  - Check for "When to use" section</action>
        <action>  - Identify improvement opportunities</action>
        <action>Create optimization plan</action>
      </actions>
      <output>optimization_plan</output>
    </step>

    <step number="3" name="optimize_skills">
      <description>Rewrite skill descriptions for better discoverability</description>
      <actions>
        <action>For each skill:</action>
        <action>  - Rewrite description for clarity</action>
        <action>  - Add/improve "When to use this skill" section</action>
        <action>  - Add triggering keywords</action>
        <action>  - Improve examples if present</action>
        <action>Store optimized versions (don't apply yet)</action>
      </actions>
      <output>optimized_skills</output>
    </step>

    <step number="4" name="preview_changes">
      <description>Show optimizations to user for review</description>
      <actions>
        <action>For each skill, show:</action>
        <action>  - Original description</action>
        <action>  - Optimized description</action>
        <action>  - Changes made</action>
        <action>Ask user to approve changes</action>
      </actions>
      <output>user_approval</output>
    </step>

    <step number="5" name="apply_changes">
      <description>Apply approved optimizations</description>
      <actions>
        <action>For each approved skill:</action>
        <action>  - Overwrite skill file with optimized version</action>
        <action>  - Track changes applied</action>
        <action>Show summary of changes</action>
      </actions>
      <output>skills_updated</output>
    </step>

    <step number="6" name="create_report">
      <description>Create optimization report</description>
      <actions>
        <action>Create .claude/skills/optimization-report.md</action>
        <action>Include: skills optimized, changes made, recommendations</action>
        <action>Show report location to user</action>
      </actions>
      <output>optimization-report.md</output>
      <file_template>
        <path>.claude/skills/optimization-report.md</path>
        <content>
# Skills Optimization Report

**Date:** {{date}}
**Skills Optimized:** {{count}}

---

## Summary

{{summary_of_changes}}

---

## Skills Optimized

{{#each skills}}
### {{skill_name}}

**Changes:**
- {{changes_description}}

**Before:**
```
{{original_description}}
```

**After:**
```
{{optimized_description}}
```

**Improvements:**
- {{improvement_1}}
- {{improvement_2}}

---
{{/each}}

## Recommendations

{{additional_recommendations}}
        </content>
      </file_template>
    </step>
  </process_flow>

  <post_flight_check>
    <check name="skills_updated">
      Verify approved skills were updated
    </check>
    <check name="report_created">
      Verify optimization report exists
    </check>
  </post_flight_check>

  <output_format>
    Use rich terminal output:
    - T1 (Command header) at start
    - T2 (Phase progress) for each step
    - T8 (Information table) for skill comparisons
    - T3 (Success) for completions
    - T12 (Completion summary) at end
  </output_format>
</command>
```

---

## Implementation Tracking

### Implementation Reports Structure

**Folder Structure:**
```
.yoyo-dev/specs/2025-10-30-feature-name/
└── implementation/
    ├── task-group-1-database-schema.md
    ├── task-group-2-api-endpoints.md
    ├── task-group-3-frontend-components.md
    └── task-group-4-testing.md
```

**Report Template:**
```markdown
# Implementation Report: Task Group {{number}} - {{name}}

**Task Group:** {{number}}
**Name:** {{name}}
**Date:** {{date}}
**Agent:** {{agent_name}}
**Status:** {{status}}

---

## Implementation Approach

{{implementation_approach_description}}

**Key Decisions:**
- {{decision_1}}
- {{decision_2}}
- {{decision_3}}

---

## Files Created

{{#each files_created}}
- {{filepath}} - {{description}}
{{/each}}

---

## Files Modified

{{#each files_modified}}
- {{filepath}} - {{changes_description}}
{{/each}}

---

## Tests Added

{{#each tests}}
{{index}}. {{test_description}}
{{/each}}

**Coverage:** {{coverage_percentage}}%

---

## Challenges Encountered

{{#if challenges}}
{{#each challenges}}
- {{challenge_description}}
  - **Resolution:** {{resolution}}
{{/each}}
{{else}}
None. Straightforward implementation.
{{/if}}

---

## Time Estimate

**Estimated:** {{estimated_time}}
**Actual:** {{actual_time}}
**Variance:** {{variance}}

---

## Notes

{{additional_notes}}
```

### Enabling Implementation Reports

**Flag in execute-tasks:**
```bash
/execute-tasks --implementation-reports
```

**In execute-tasks.md instruction:**
```xml
<step number="4" name="task_execution_loop">
  <description>Execute all assigned tasks</description>
  <instructions>
    For each parent task:
    1. Execute task following TDD approach
    2. IF --implementation-reports flag enabled:
       - Create implementation/task-group-N.md
       - Document approach, decisions, files, tests, challenges, time
    3. Verify tests pass
    4. Mark task complete
  </instructions>
</step>
```

---

## Verification Workflows

### Verification Structure

**Folder Structure:**
```
.yoyo-dev/specs/2025-10-30-feature-name/
└── verification/
    └── final-verification.md
```

**Verification Template:**
```markdown
# Final Verification Report

**Spec:** {{spec_name}}
**Date:** {{date}}
**Verifier:** implementation-verifier agent

---

## Verification Summary

**Overall Status:** {{pass|fail}}
**Checks Passed:** {{passed_count}}/{{total_count}}

---

## Functionality Verification

**Status:** {{pass|fail}}

**Checks:**
- [ ] All features work as specified
- [ ] All acceptance criteria met
- [ ] No critical bugs
- [ ] Edge cases handled

**Details:**
{{functionality_details}}

---

## Test Coverage Verification

**Status:** {{pass|fail}}

**Checks:**
- [ ] All tests pass
- [ ] Coverage >= 80%
- [ ] Edge cases tested
- [ ] Integration tests present

**Coverage:** {{coverage_percentage}}%

**Details:**
{{test_details}}

---

## Accessibility Verification

**Status:** {{pass|fail}}

**Checks:**
- [ ] WCAG AA compliance
- [ ] Color contrast >= 4.5:1
- [ ] Focus states present
- [ ] ARIA labels correct
- [ ] Keyboard navigation works

**Details:**
{{accessibility_details}}

---

## Performance Verification

**Status:** {{pass|fail}}

**Checks:**
- [ ] No performance regressions
- [ ] Meets performance budgets
- [ ] No memory leaks
- [ ] Efficient algorithms

**Details:**
{{performance_details}}

---

## Security Verification

**Status:** {{pass|fail}}

**Checks:**
- [ ] No security vulnerabilities
- [ ] Input validation present
- [ ] Auth/authz correct
- [ ] No sensitive data exposure

**Details:**
{{security_details}}

---

## Documentation Verification

**Status:** {{pass|fail}}

**Checks:**
- [ ] Code documented
- [ ] README updated
- [ ] API docs current
- [ ] Examples provided

**Details:**
{{documentation_details}}

---

## Issues Found

{{#if issues}}
{{#each issues}}
### Issue {{index}}: {{title}}

**Severity:** {{severity}}
**Description:** {{description}}
**Recommendation:** {{recommendation}}

---
{{/each}}
{{else}}
No issues found. ✅
{{/if}}

---

## Recommendations

{{recommendations}}
```

### Integration into Post-Execution

**In post-execution-tasks.md:**
```xml
<step number="4" subagent="implementation-verifier" name="verify_implementation">
  <description>Verify implementation completeness and quality</description>
  <instructions>
    Run systematic verification:
    1. Functionality verification
    2. Test coverage verification
    3. Accessibility verification
    4. Performance verification
    5. Security verification
    6. Documentation verification

    Create verification/final-verification.md with results.

    If critical issues found, STOP and report to user.
    If all checks pass, continue to next step.
  </instructions>
  <output>verification_results</output>
</step>
```

---

## Configuration Schema

### config.yml Structure

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

# Workflow system
workflow_system:
  max_nesting_depth: 3  # Maximum workflow reference nesting
  cache_enabled: true   # Cache expanded workflows
  cache_size: 100       # Max workflows in cache
```

---

## Testing Strategy

### Unit Tests

**Workflow Expansion:**
- Test simple reference expansion
- Test nested reference expansion (1, 2, 3 levels)
- Test cycle detection
- Test missing workflow file handling
- Test max depth exceeded handling
- Test cache invalidation

**Agent Parsing:**
- Test YAML frontmatter parsing
- Test workflow reference extraction
- Test agent execution with expanded workflows

### Integration Tests

**Commands:**
- Test `/orchestrate-tasks` end-to-end
- Test `/improve-skills` end-to-end
- Test orchestration.yml generation
- Test skills optimization report

**Features:**
- Test implementation reports creation
- Test verification workflows execution
- Test workflow references in agents

### Regression Tests

**Existing Commands:**
- Test `/plan-product` (no changes)
- Test `/create-spec` (no changes)
- Test `/create-tasks` (no changes)
- Test `/execute-tasks` (with and without new flags)
- Test all design system commands

---

## Performance Benchmarks

### Target Metrics

- **Workflow expansion:** < 100ms per agent
- **Cache hit rate:** > 90%
- **Orchestration overhead:** < 200ms
- **Implementation report generation:** < 500ms
- **Verification workflows:** < 5s total

### Monitoring

- Log workflow expansion times
- Track cache hit/miss ratio
- Measure end-to-end command execution time
- Compare with baseline (before integration)

---

## Migration Plan

### No Migration Needed

**Key Points:**
- All existing commands continue to work unchanged
- New features are opt-in via flags or config
- No changes to existing `.yoyo-dev/` structures
- Backward compatible

### Optional Enhancements

**Projects can optionally:**
1. Update agents to use workflow references
2. Enable implementation reports
3. Use `/orchestrate-tasks` for complex scenarios
4. Run `/improve-skills` to optimize skills

**No forced changes required.**

---

## Rollout Strategy

### Phase 1: Foundation (Week 1)
- Deploy workflow system
- Test workflow expansion
- Update documentation

### Phase 2: Agents (Week 2)
- Deploy new agents
- Test agent functionality
- Update config.yml

### Phase 3: Commands (Week 3)
- Deploy `/orchestrate-tasks`
- Deploy `/improve-skills`
- Test commands end-to-end

### Phase 4: Features (Week 4)
- Deploy implementation reports
- Deploy verification workflows
- Integration testing

### Phase 5: Documentation (Week 5)
- Finalize CLAUDE.md updates
- Create usage guides
- Create examples

### Phase 6: Stabilization (Week 6)
- Bug fixes
- Performance optimization
- Community feedback

---

## API Reference

### Workflow Reference Syntax

```
{{workflows/category/workflow-name.md}}
```

**Examples:**
- `{{workflows/planning/gather-product-info.md}}`
- `{{workflows/specification/write-spec.md}}`
- `{{workflows/implementation/implement-tasks.md}}`

### Command Flags

**`/execute-tasks` flags:**
- `--implementation-reports` - Enable implementation tracking
- `--no-verification` - Skip verification workflows (not recommended)

**`/orchestrate-tasks` flags:**
- `--prompt-files` - Generate prompt markdown files instead of executing

**`/improve-skills` flags:**
- `--all` - Optimize all skills without asking
- `--dry-run` - Preview changes without applying

---

## Error Handling

### Workflow Reference Errors

**Missing Workflow File:**
```
Error: Workflow not found: workflows/invalid/path.md

The agent 'implementer' references a workflow that doesn't exist.
Please check the workflow path and ensure the file exists.

Referenced in: .yoyo-dev/claude-code/agents/implementer.md
```

**Circular Reference:**
```
Error: Circular workflow reference detected

Workflow A references Workflow B, which references Workflow A.
This creates an infinite loop.

Reference chain:
  workflows/spec/write-spec.md
  -> workflows/spec/verify-spec.md
  -> workflows/spec/write-spec.md (circular!)

Please remove the circular reference.
```

**Max Depth Exceeded:**
```
Error: Maximum workflow nesting depth (3) exceeded

Workflows are nested too deeply. The maximum allowed depth is 3 levels.

Reference chain:
  workflows/a.md
  -> workflows/b.md
  -> workflows/c.md
  -> workflows/d.md (depth 4 - too deep!)

Please reduce nesting depth.
```

---

## Security Considerations

### Workflow Injection Prevention

- Validate workflow paths (no `../` traversal)
- Only read from `workflows/` directory
- Sanitize workflow content before expansion

### Agent Execution Safety

- Agents run with same permissions as main process
- No privilege escalation
- Workflow content is markdown only (no code execution during expansion)

---

## Appendix

### File Checklist

**New Files:**
- [ ] `workflows/planning/` (4 files)
- [ ] `workflows/specification/` (4 files)
- [ ] `workflows/implementation/` (4 files + verification subfolder)
- [ ] `.yoyo-dev/claude-code/agents/spec-initializer.md`
- [ ] `.yoyo-dev/claude-code/agents/spec-shaper.md`
- [ ] `.yoyo-dev/claude-code/agents/spec-writer.md`
- [ ] `.yoyo-dev/claude-code/agents/tasks-list-creator.md`
- [ ] `.yoyo-dev/claude-code/agents/implementer.md`
- [ ] `.yoyo-dev/claude-code/agents/implementation-verifier.md`
- [ ] `.yoyo-dev/claude-code/agents/product-planner.md`
- [ ] `.claude/commands/orchestrate-tasks.md`
- [ ] `.claude/commands/improve-skills.md`
- [ ] `.yoyo-dev/instructions/core/orchestrate-tasks.md`
- [ ] `.yoyo-dev/instructions/core/improve-skills.md`

**Modified Files:**
- [ ] `.yoyo-dev/instructions/core/execute-tasks.md`
- [ ] `.yoyo-dev/instructions/core/post-execution-tasks.md`
- [ ] `.yoyo-dev/config.yml`
- [ ] `CLAUDE.md`

---

## Related Resources

- Workflow files: `workflows/`
- Agent files: `.yoyo-dev/claude-code/agents/`
- Instruction files: `.yoyo-dev/instructions/core/`
- Configuration: `.yoyo-dev/config.yml`
- Standards: `.yoyo-dev/standards/`
