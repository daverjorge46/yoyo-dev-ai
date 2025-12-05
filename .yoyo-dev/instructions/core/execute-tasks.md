---
description: Rules to initiate execution of a set of tasks using Yoyo Dev
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Task Execution Rules

## Overview

Execute tasks for a given spec following three distinct phases:
1. Pre-execution setup (Steps 1-5)
2. Parallel task execution (Steps 6-7: dependency analysis → parallel execution)
3. Post-execution tasks (Step 8)

**NEW**: Automatic parallel execution analysis and multi-task concurrency for faster development.

**IMPORTANT**: All three phases MUST be completed. Do not stop after phase 2.

## Optional Review Modes

Tasks can be executed with optional review mode flags to apply critical review during implementation:

```bash
/execute-tasks --devil        # Apply devil's advocate review (find what will break)
/execute-tasks --security     # Apply security review (vulnerabilities, auth)
/execute-tasks --performance  # Apply performance review (bottlenecks, optimization)
/execute-tasks --production   # Apply production readiness review (error handling, monitoring)
```

**When review mode is active:**
- Each implementation step includes critical analysis
- Code is validated against review mode checklist
- Issues are identified and fixed during implementation
- Extra scrutiny applied before marking tasks complete

**Default behavior:** No review mode (standard constructive development)

**Multiple modes supported:**
```bash
/execute-tasks --security --performance  # Apply both security and performance review
```

## Optional Implementation Reports

Tasks can be executed with optional implementation tracking to generate detailed per-task-group reports:

```bash
/execute-tasks --implementation-reports  # Generate detailed implementation reports
```

**When implementation reports are enabled:**
- Creates `implementation/` folder in spec directory
- For each completed task group, generates `implementation/task-group-N.md` with:
  - Implementation approach taken
  - Key technical decisions made
  - Files created and modified
  - Tests run and results
  - Challenges encountered and solutions
  - Time taken for task group
- Reports help document implementation history and decision rationale
- Useful for knowledge transfer, audits, and retrospectives

**Default behavior:** No implementation reports (standard execution)

**Combined with review modes:**
```bash
/execute-tasks --implementation-reports --security  # Reports + security review
```

<pre_flight_check>
  EXECUTE: @.yoyo-dev/instructions/meta/pre-flight.md
</pre_flight_check>

<process_flow>

## Phase 1: Pre-Execution Setup

<step number="0" name="session_recovery_check">

### Step 0: Session Recovery Check (Git-Based State Reconstruction)

**Purpose**: Detect incomplete work from previous sessions and reconstruct state from git history.

<session_recovery>
  ACTION: Check if this is a resumed session by analyzing git log

  RUN: `git log --oneline -50`

  PARSE: Look for commits with task-related prefixes:
    - `[TESTED]` - Task fully verified (implemented=true, tested=true)
    - `[FEATURE]` - Task implemented (implemented=true, tested=false)
    - `[PARTIAL]` - Task in progress (implemented=true, tested=false)

  PATTERN: `task-(\d+\.\d+)` to extract task IDs

  RULE: Most recent commit status wins (first match in reverse chronological order)

  BUILD: Task status map from git history:
    ```
    git_status = {
      "task_id": "status",  // tested | implemented | partial
      ...
    }
    ```

  CROSS-REFERENCE: Compare git status with features.json and tasks.md
    IF features.json exists:
      - Update implemented/tested flags based on git status
      - Recalculate progress_summary.completion_percentage
      - Save updated features.json

  FIND: Next incomplete task
    - First task not marked as [TESTED] in git history
    - Or first task with status != "tested"

  IF task_related_commits_found > 0:
    OUTPUT: Session recovery summary

    ╔═══════════════════════════════════════════════════════════╗
    ║  🔄 SESSION RECOVERY FROM GIT HISTORY                     ║
    ╠═══════════════════════════════════════════════════════════╣
    ║                                                           ║
    ║  Commits Analyzed:    50 most recent                      ║
    ║  Task Commits Found:  [N]                                 ║
    ║                                                           ║
    ║  ✅ Completed (Tested):  [N] tasks                        ║
    ║  🔧 Implemented:         [N] tasks                        ║
    ║  🔄 Partial:             [N] tasks                        ║
    ║  ⬜ Not Started:         [N] tasks                        ║
    ║                                                           ║
    ║  📍 Resume Point: Task [X.Y]                              ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝

    AUTO_SELECT: Set resume_task as default for Step 2 (Task Assignment)
    INFORM: User of detected state and proposed resume point

  ELSE:
    NOTE: "No prior task commits detected, starting fresh"
    PROCEED: To Step 1

</session_recovery>

</step>

<step number="1" name="review_mode_detection">

### Step 1: Review Mode Detection

Detect if user has specified any review mode flags and load appropriate review guidelines.

<review_mode_flags>
  --devil        → Devil's Advocate (find what will break)
  --security     → Security Review (vulnerabilities, auth, data leaks)
  --performance  → Performance Review (bottlenecks, optimization)
  --production   → Production Readiness (error handling, monitoring)
  --premortem    → Pre-Mortem Analysis (why will this fail?)
  --quality      → Code Quality (maintainability, tests)
</review_mode_flags>

<instructions>
  ACTION: Check if any review mode flags are present
  IF review mode detected:
    LOAD: @.yoyo-dev/standards/review-modes.md (specific mode sections)
    NOTE: "Applying [mode] review during task execution"
    APPLY: Review mode checklist during implementation
  ELSE:
    NOTE: "Using standard constructive development"
    SKIP: Review mode guidelines
</instructions>

</step>

<step number="2" name="task_assignment">

### Step 2: Task Assignment

Identify which tasks to execute from the spec (using spec_srd_reference file path and optional specific_tasks array), defaulting to the next uncompleted parent task if not specified.

<task_selection>
  <explicit>user specifies exact task(s)</explicit>
  <implicit>find next uncompleted task in tasks.md</implicit>
</task_selection>

<instructions>
  ACTION: Identify task(s) to execute
  DEFAULT: Select next uncompleted parent task if not specified
  CONFIRM: Task selection with user
</instructions>

</step>

<step number="3" subagent="context-fetcher" name="context_analysis">

### Step 3: Context Analysis

Use the context-fetcher subagent to gather minimal context for task understanding by always loading spec tasks.md, and conditionally loading @.yoyo-dev/product/mission-lite.md, spec-lite.md, and sub-specs/technical-spec.md if not already in context.

<instructions>
  ACTION: Use context-fetcher subagent to:
    - REQUEST: "Get technical decisions from decisions.md"
    - REQUEST: "Get product pitch from mission-lite.md"
    - REQUEST: "Get spec summary from spec-lite.md"
    - REQUEST: "Get technical approach from technical-spec.md"
  PROCESS: Returned information
</instructions>


<context_gathering>
  <essential_docs>
    - tasks.md for task breakdown
    - decisions.md for technical decisions and rationale
    - context.md for implementation progress (if exists)
  </essential_docs>
  <conditional_docs>
    - mission-lite.md for product alignment
    - spec-lite.md for feature summary
    - technical-spec.md for implementation details
  </conditional_docs>
</context_gathering>

</step>

<step number="4" name="update_execution_state">

### Step 4: Update Execution State

Update state.json to mark execution as started and record the current task.

<state_update>
  <file_path>.yoyo-dev/specs/[SPEC_FOLDER]/state.json</file_path>
  <updates>
    - execution_started: [CURRENT_DATE] (if null)
    - current_phase: "implementation"
    - active_task: [TASK_NUMBER]
  </updates>
</state_update>

<instructions>
  ACTION: Read state.json
  UPDATE: Set execution_started if first execution
  UPDATE: Set current_phase to "implementation"
  UPDATE: Set active_task to current task number
  SAVE: Updated state
</instructions>

</step>

<step number="5" name="git_status_check">

### Step 5: Git Status Check

Check git status to ensure we're aware of the current branch and any uncommitted changes before starting execution.

<instructions>
  ACTION: Run git status to show current branch
  NOTE: All work will be committed to the current active branch
  WARN: If uncommitted changes exist from previous work
  PROCEED: Continue on current branch (no branch creation/switching)
</instructions>

<note>
  Yoyo Dev no longer creates or switches branches during task execution.
  All changes are committed to the current active branch.
</note>

</step>

## Phase 2: Task Execution Loop (with Parallel Execution)

<consciousness_check_protocol>

### Pre-Action Consciousness Check

Before starting significant work, perform a brief internal self-awareness check.

**Trigger Points:**
- Starting a new parent task
- Making architectural decisions
- Encountering ambiguous requirements
- Before marking task complete

**Check Template (Internal - Brief):**

```xml
<consciousness_check>
  Purpose: [What am I trying to accomplish? 1 sentence]
  Approach: [Is this the right approach? Reference existing patterns]
  Uncertainty: [Am I uncertain about anything? Be honest]
</consciousness_check>
```

**When to Skip:**
- Routine subtasks with clear requirements
- Following established patterns without variation
- Simple edits with no decision points

**Important:**
- Keep checks internal (not verbose output)
- Total check under 50 words
- If uncertainty detected, express it before proceeding

</consciousness_check_protocol>

<step number="6" name="dependency_analysis">

### Step 6: Dependency Analysis & Execution Planning

**NEW**: Analyze task dependencies and create parallel execution plan.

<dependency_analysis>
  LOAD: @.yoyo-dev/standards/parallel-execution.md

  ACTION: Analyze all assigned tasks for parallel execution opportunities

  FOR each task in assigned_tasks:
    EXTRACT from tasks.md:
      - Dependencies field
      - Files to Create field
      - Files to Modify field
      - Parallel Safe field

    IF metadata missing:
      INFER from subtask descriptions:
        - Which files will be created/modified
        - Whether task depends on others

  BUILD: Dependency graph
    - Identify tasks with no dependencies (Group 0)
    - Identify tasks that depend only on Group 0 (Group 1)
    - Continue grouping by dependency levels

  DETECT: File conflicts
    FOR each task_pair (A, B):
      IF A.files_to_modify ∩ B.files_to_modify != ∅:
        CONFLICT: Cannot run in parallel
      IF A.files_to_create ∩ B.files_to_read != ∅:
        DEPENDENCY: B depends on A

  CREATE: Execution plan with parallel groups

  OUTPUT: Parallel execution plan (formatted)

  \033[1m\033[36m╔═══════════════════════════════════════════════════════════╗\033[0m
  \033[1m\033[36m║\033[0m  ⚡ PARALLEL EXECUTION PLAN                               \033[1m\033[36m║\033[0m
  \033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
  \033[36m║\033[0m                                                           \033[36m║\033[0m
  \033[36m║\033[0m  Total Tasks:        [N]                                  \033[36m║\033[0m
  \033[36m║\033[0m  Parallel Groups:    [G]                                  \033[36m║\033[0m
  \033[36m║\033[0m  Max Concurrency:    [M] tasks                            \033[36m║\033[0m
  \033[36m║\033[0m  Est. Time Saved:    ~[P]% faster                         \033[36m║\033[0m
  \033[36m║\033[0m                                                           \033[36m║\033[0m
  \033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
  \033[1m\033[36m║\033[0m  GROUP 1: [Name] (Parallel - [N] tasks)                  \033[1m\033[36m║\033[0m
  \033[1m\033[36m╠═══════════════════════════════════════════════════════════╣\033[0m
  \033[36m║\033[0m    • Task [N]: [Name]                                     \033[36m║\033[0m
  \033[36m║\033[0m    • Task [N]: [Name]                                     \033[36m║\033[0m
  \033[36m║\033[0m    \033[32m✓\033[0m No file conflicts detected                         \033[36m║\033[0m
  \033[1m\033[36m╚═══════════════════════════════════════════════════════════╝\033[0m

  IF all_tasks_sequential:
    NOTE: "All tasks must run sequentially (dependencies detected)"
    PROCEED: With sequential execution

  ELSE IF parallel_opportunities_found:
    ASK: "Execute with parallel processing? (Y/n)"
    DEFAULT: Yes
    WAIT: User confirmation

</dependency_analysis>

</step>

<step number="7" name="parallel_task_execution">

### Step 7: Parallel Task Execution Loop

**IMPORTANT**: Execute tasks in parallel groups when possible.

<execution_strategy>
  IF user_approved_parallel OR force_parallel_flag:
    EXECUTE: Parallel execution mode
  ELSE:
    EXECUTE: Sequential execution mode (fallback)
</execution_strategy>

<parallel_execution_flow>
  LOAD: @.yoyo-dev/instructions/core/execute-task.md ONCE

  FOR each execution_group in execution_plan:

    OUTPUT: Group header
      \033[1m\033[34m┌─ GROUP [N]: [NAME] ────────────────────────────┐\033[0m
      \033[34m│\033[0m  Executing [M] tasks in parallel...               \033[34m│\033[0m
      \033[1m\033[34m└────────────────────────────────────────────────┘\033[0m

    IF group.task_count > 1:
      # PARALLEL EXECUTION
      START_TIME: Record start time

      EXECUTE: All tasks in group concurrently
        # Use multiple Task tool calls in SINGLE message!
        SEND_MESSAGE:
          - Task tool (general-purpose agent) for Task A
          - Task tool (general-purpose agent) for Task B
          - Task tool (general-purpose agent) for Task C

      PROMPT for each agent:
        "Execute Task [N] from tasks.md following execute-task.md instructions.
         Files assigned: [file_list]
         Report completion status."

      WAIT: For all parallel tasks to complete

      COLLECT: Results from all agents
        - Success/failure status
        - Files created/modified
        - Test results
        - Any errors encountered

      END_TIME: Record end time
      CALCULATE: Time taken

      CHECK: All tasks in group succeeded
        IF any_task_failed:
          OUTPUT: Error summary (T4 - Error template)
          STOP: Do not proceed to next group
          OFFER: Fix failed task and retry, or abort

        ELSE:
          OUTPUT: Group completion
            \033[32m✓\033[0m Group [N] completed in [time] ([M] tasks parallel)

          UPDATE: tasks.md with completed statuses

          IF --implementation-reports flag enabled:
            CREATE: implementation/ folder if not exists
            GENERATE: implementation/task-group-N.md report

            TEMPLATE:
              # Task Group [N]: [NAME] - Implementation Report

              **Completed:** [DATE_TIME]
              **Duration:** [TIME_TAKEN]

              ## Implementation Approach
              [Summary of approach taken for this task group]

              ## Key Decisions
              [Technical decisions made during implementation]
              - Decision 1: [rationale]
              - Decision 2: [rationale]

              ## Files Changed

              **Created:**
              - [file1]
              - [file2]

              **Modified:**
              - [file1]
              - [file2]

              ## Tests
              [Test results for this task group]
              - Test suite: [name]
              - Tests run: [count]
              - Pass rate: [percentage]

              ## Challenges & Solutions
              [Any challenges encountered and how they were resolved]
              - Challenge 1: [description]
                - Solution: [resolution]

              ## Time Breakdown
              - Planning: [time]
              - Implementation: [time]
              - Testing: [time]
              - Total: [TIME_TAKEN]

          CONTINUE: To next group

          # Generate progress.md after parent feature completion
          IF parent_feature_fully_tested:
            GENERATE: progress.md in spec folder
            TEMPLATE: Use project-manager progress.md template
            INCLUDE:
              - Spec metadata and timestamp
              - Completion percentage from features.json
              - Completed features list
              - In-progress features list
              - Remaining features list
              - Git Log Summary (recent task commits)
              - Resume Instructions with next task

    ELSE:
      # SEQUENTIAL EXECUTION (single task in group)
      OUTPUT: "Executing Task [N]..."

      START_TIME: Record start time
      EXECUTE: Single task using execute-task.md
      WAIT: For completion
      CHECK: Success
      END_TIME: Record end time
      UPDATE: tasks.md

      IF --implementation-reports flag enabled:
        CREATE: implementation/ folder if not exists
        GENERATE: implementation/task-group-N.md report (same template as parallel)

  END FOR

  OUTPUT: Parallel execution summary

  \033[1m\033[42m\033[30m╔═══════════════════════════════════════════════════════════╗\033[0m
  \033[1m\033[42m\033[30m║  ⚡ PARALLEL EXECUTION COMPLETE                           ║\033[0m
  \033[1m\033[42m\033[30m╠═══════════════════════════════════════════════════════════╣\033[0m
  \033[42m\033[30m║                                                           ║\033[0m
  \033[42m\033[30m║  Tasks Completed:  [N]/[N]  ████████████████████ 100%    ║\033[0m
  \033[42m\033[30m║  Total Time:       [MM]:[SS]                              ║\033[0m
  \033[42m\033[30m║  Time Saved:       ~[MM]:[SS] ([P]% faster)               ║\033[0m
  \033[42m\033[30m║  Max Concurrency:  [M] tasks                              ║\033[0m
  \033[42m\033[30m║                                                           ║\033[0m
  \033[1m\033[42m\033[30m╚═══════════════════════════════════════════════════════════╝\033[0m

  **IMPORTANT**: After loop completes, CONTINUE to Phase 3 (Step 8). Do not stop here.
</parallel_execution_flow>

<sequential_execution_fallback>
  IF parallel_execution_disabled OR user_declined:

    EXECUTE: Traditional sequential execution

    FOR each parent_task assigned:
      START_TIME: Record start time
      EXECUTE: Task using execute-task.md
      WAIT: For completion
      END_TIME: Record end time
      UPDATE: tasks.md status

      IF --implementation-reports flag enabled:
        CREATE: implementation/ folder if not exists
        GENERATE: implementation/task-group-N.md report (same template as parallel)
    END FOR

</sequential_execution_fallback>

</step>

<loop_logic>
  <continue_conditions>
    - More unfinished parent tasks exist
    - User has not requested stop
  </continue_conditions>
  <exit_conditions>
    - All assigned tasks marked complete
    - User requests early termination
    - Blocking issue prevents continuation
  </exit_conditions>
</loop_logic>

<task_status_check>
  AFTER each task execution:
    CHECK tasks.md for remaining tasks
    IF all assigned tasks complete:
      PROCEED to next step
    ELSE:
      CONTINUE with next task
</task_status_check>

<instructions>
  ACTION: Load execute-task.md instructions once at start
  REUSE: Same instructions for each parent task iteration
  LOOP: Through all assigned parent tasks
  UPDATE: Task status after each completion
  VERIFY: All tasks complete before proceeding
  HANDLE: Blocking issues appropriately
  **IMPORTANT**: When all tasks complete, proceed to Step 5
</instructions>

</step>

## Phase 3: Post-Execution Tasks

<step number="8" name="post_execution_tasks">

### Step 8: Run the task completion steps

**CRITICAL**: This step MUST be executed after all tasks are implemented. Do not end the process without completing this phase.

After all tasks in tasks.md have been implemented, use @.yoyo-dev/instructions/core/post-execution-tasks.md to run our series of steps we always run when finishing and delivering a new feature.

<instructions>
  LOAD: @.yoyo-dev/instructions/core/post-execution-tasks.md once
  ACTION: execute all steps in the post-execution-tasks.md process_flow.
  **IMPORTANT**: This includes:
    - Running full test suite
    - Git workflow (commit, push, PR)
    - Verifying task completion
    - Updating roadmap (if applicable)
    - Creating recap document
    - Generating completion summary
    - Playing notification sound
</instructions>

</step>

</process_flow>

<post_flight_check>
  EXECUTE: @.yoyo-dev/instructions/meta/post-flight.md
</post_flight_check>
