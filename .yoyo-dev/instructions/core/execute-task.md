---
description: Rules to execute a task and its sub-tasks using Yoyo Dev
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Task Execution Rules

## Overview

Execute a specific task along with its sub-tasks systematically following a TDD development workflow.

<pre_flight_check>
  EXECUTE: @.yoyo-dev/instructions/meta/pre-flight.md
</pre_flight_check>


<process_flow>

<step number="1" name="task_understanding">

### Step 1: Task Understanding

Read and analyze the given parent task and all its sub-tasks from tasks.md to gain complete understanding of what needs to be built.

<task_analysis>
  <read_from_tasks_md>
    - Parent task description
    - All sub-task descriptions
    - Task dependencies
    - Expected outcomes
  </read_from_tasks_md>
</task_analysis>

<instructions>
  ACTION: Read the specific parent task and all its sub-tasks
  ANALYZE: Full scope of implementation required
  UNDERSTAND: Dependencies and expected deliverables
  NOTE: Test requirements for each sub-task
</instructions>

</step>

<step number="2" name="technical_spec_review">

### Step 2: Technical Specification Review

Search and extract relevant sections from technical-spec.md to understand the technical implementation approach for this task.

<selective_reading>
  <search_technical_spec>
    FIND sections in technical-spec.md related to:
    - Current task functionality
    - Implementation approach for this feature
    - Integration requirements
    - Performance criteria
  </search_technical_spec>
</selective_reading>

<instructions>
  ACTION: Search technical-spec.md for task-relevant sections
  EXTRACT: Only implementation details for current task
  SKIP: Unrelated technical specifications
  FOCUS: Technical approach for this specific feature
</instructions>

</step>

<step number="3" subagent="context-fetcher" name="best_practices_review">

### Step 3: Best Practices Review

Use the context-fetcher subagent to retrieve relevant sections from @.yoyo-dev/standards/best-practices.md that apply to the current task's technology stack and feature type.

<selective_reading>
  <search_best_practices>
    FIND sections relevant to:
    - Task's technology stack
    - Feature type being implemented
    - Testing approaches needed
    - Code organization patterns
  </search_best_practices>
</selective_reading>

<instructions>
  ACTION: Use context-fetcher subagent
  REQUEST: "Find best practices sections relevant to:
            - Task's technology stack: [CURRENT_TECH]
            - Feature type: [CURRENT_FEATURE_TYPE]
            - Testing approaches needed
            - Code organization patterns"
  PROCESS: Returned best practices
  APPLY: Relevant patterns to implementation
</instructions>

</step>

<step number="4" subagent="context-fetcher" name="code_style_review">

### Step 4: Code Style Review

Use the context-fetcher subagent to retrieve relevant code style rules from @.yoyo-dev/standards/code-style.md for the languages and file types being used in this task.

<selective_reading>
  <search_code_style>
    FIND style rules for:
    - Languages used in this task
    - File types being modified
    - Component patterns being implemented
    - Testing style guidelines
  </search_code_style>
</selective_reading>

<instructions>
  ACTION: Use context-fetcher subagent
  REQUEST: "Find code style rules for:
            - Languages: [LANGUAGES_IN_TASK]
            - File types: [FILE_TYPES_BEING_MODIFIED]
            - Component patterns: [PATTERNS_BEING_IMPLEMENTED]
            - Testing style guidelines"
  PROCESS: Returned style rules
  APPLY: Relevant formatting and patterns
</instructions>

</step>

<step number="5" name="task_execution">

### Step 5: Task and Sub-task Execution

Execute the parent task and all sub-tasks in order using test-driven development (TDD) approach.

<typical_task_structure>
  <first_subtask>Write tests for [feature]</first_subtask>
  <middle_subtasks>Implementation steps</middle_subtasks>
  <final_subtask>Verify all tests pass</final_subtask>
</typical_task_structure>

<execution_order>
  <subtask_1_tests>
    IF sub-task 1 is "Write tests for [feature]":
      - Write all tests for the parent feature
      - Include unit tests, integration tests, edge cases
      - Run tests to ensure they fail appropriately
      - Mark sub-task 1 complete
  </subtask_1_tests>

  <middle_subtasks_implementation>
    FOR each implementation sub-task (2 through n-1):
      - Implement the specific functionality
      - Make relevant tests pass
      - Update any adjacent/related tests if needed
      - Refactor while keeping tests green
      - Mark sub-task complete
  </middle_subtasks_implementation>

  <final_subtask_verification>
    IF final sub-task is "Verify all tests pass":
      - Run entire test suite
      - Fix any remaining failures
      - Ensure no regressions
      - Mark final sub-task complete
  </final_subtask_verification>
</execution_order>

<test_management>
  <new_tests>
    - Written in first sub-task
    - Cover all aspects of parent feature
    - Include edge cases and error handling
  </new_tests>
  <test_updates>
    - Made during implementation sub-tasks
    - Update expectations for changed behavior
    - Maintain backward compatibility
  </test_updates>
</test_management>

<instructions>
  ACTION: Execute sub-tasks in their defined order
  RECOGNIZE: First sub-task typically writes all tests
  IMPLEMENT: Middle sub-tasks build functionality
  VERIFY: Final sub-task ensures all tests pass
  UPDATE: Mark each sub-task complete as finished
</instructions>

</step>

<step number="6" subagent="test-runner" name="task_test_verification">

### Step 6: Task-Specific Test Verification (MANDATORY)

**CRITICAL**: Use the test-runner subagent to run tests and obtain STRUCTURED TEST EVIDENCE. This evidence is REQUIRED before any task can be marked complete.

<focused_test_execution>
  <run_only>
    - All new tests written for this parent task
    - All tests updated during this task
    - Tests directly related to this feature
  </run_only>
  <skip>
    - Full test suite (done later in execute-tasks.md)
    - Unrelated test files
  </skip>
</focused_test_execution>

<test_evidence_requirement>
  **MANDATORY OUTPUT**: test-runner MUST return structured evidence:

  ```json
  {
    "task_id": "[CURRENT_TASK_ID]",
    "test_type": "unit|integration|browser|e2e",
    "test_command": "[COMMAND_EXECUTED]",
    "exit_code": 0,
    "tests_passed": 10,
    "tests_failed": 0,
    "timestamp": "YYYY-MM-DDTHH:MM:SSZ"
  }
  ```

  This evidence will be used to:
  1. Block task completion if tests fail
  2. Update features.json tested status
  3. Provide audit trail for session recovery
</test_evidence_requirement>

<completion_blocking>
  **BLOCKING RULES**:

  ✅ Task CAN proceed to Step 7 if:
    - exit_code == 0
    - tests_failed == 0
    - tests_passed > 0
    - task_id matches current task

  ❌ Task CANNOT proceed if:
    - No test evidence returned
    - exit_code != 0
    - tests_failed > 0
    - tests_passed == 0

  IF blocked:
    - DO NOT proceed to Step 7
    - Debug and fix failing tests
    - Re-run test-runner
    - Repeat until all tests pass
</completion_blocking>

<final_verification>
  IF test evidence shows failures:
    - STOP: Do not proceed to Step 7
    - Debug and fix the specific issue
    - Re-run test-runner subagent
    - Repeat until exit_code == 0 and tests_failed == 0
  ELSE IF test evidence shows success:
    - STORE: Test evidence for Step 8
    - Confirm all task tests passing
    - Ready to proceed to Step 7
</final_verification>

<instructions>
  ACTION: Use test-runner subagent
  REQUEST: "Run tests for [this parent task's test files] and return structured evidence"
  WAIT: For test-runner to return JSON evidence
  VALIDATE: Evidence has exit_code == 0 and tests_failed == 0
  IF validation fails:
    BLOCK: Do not proceed
    FIX: Address test failures
    RETRY: Run test-runner again
  STORE: Valid test evidence for use in Step 8
  PROCEED: Only after evidence validates successfully
</instructions>

</step>

<step number="6.5" subagent="git-workflow" name="incremental_commit">

### Step 6.5: Incremental Commit (Context Recovery)

**CRITICAL**: After tests pass, create a [TESTED] commit to enable session recovery.

<commit_requirement>
  This commit serves as a recovery point if the session is interrupted.
  Git log parsing uses these commits to reconstruct state.
</commit_requirement>

<commit_workflow>
  1. **Stage implementation files:**
     ```bash
     git add [files_modified_in_this_task]
     ```

  2. **Create [TESTED] commit:**
     ```bash
     git commit -m "[TESTED] task-X.Y: [Brief description]

     - All tests passing ([N]/[N])
     - Feature verified and complete"
     ```

  3. **Stage state files:**
     ```bash
     git add features.json progress.md state.json
     ```

  4. **Create state files commit:**
     ```bash
     git commit -m "chore: Update progress tracking for task-X.Y

     - features.json: Updated completion status
     - progress.md: Regenerated with latest state"
     ```
</commit_workflow>

<commit_validation>
  VERIFY: [TESTED] commit created successfully
    - Commit message has [TESTED] prefix
    - Commit message includes task-X.Y identifier
    - All implementation files staged

  IF commit fails:
    - Resolve git issues
    - Retry commit
    - Do not proceed without successful commit
</commit_validation>

<instructions>
  ACTION: Use git-workflow subagent
  REQUEST: "Create [TESTED] commit for task-X.Y:
            - Implementation files: [FILE_LIST]
            - Test count: [N] passing
            - Then create state files commit"
  WAIT: For commit confirmation
  VERIFY: Both commits created successfully
  PROCEED: Only after commits succeed
</instructions>

</step>

<step number="7" name="update_context_file">

### Step 7: Update Implementation Context

After completing the task, update the context.md file with implementation details, patterns used, and key learnings.

<context_file_location>
  .yoyo-dev/specs/[SPEC_FOLDER]/context.md
</context_file_location>

<update_structure>
  <file_locations>
    - Add new files created during this task
    - Update existing file locations if modified
    - Group by feature area or component type
  </file_locations>
  <key_patterns>
    - Document patterns successfully applied
    - Note reusable approaches
    - Reference similar implementations
  </key_patterns>
  <challenges_solutions>
    - Record challenges encountered
    - Document solutions found
    - Note what worked and what didn't
  </challenges_solutions>
  <technical_notes>
    - Important implementation details
    - Performance considerations applied
    - Security measures implemented
  </technical_notes>
</update_structure>

<context_template>
  ## Task [NUMBER]: [TASK_NAME]

  **Files Modified/Created:**
  - `[file_path]` - [purpose]

  **Patterns Applied:**
  - [pattern_name]: [how it was used]

  **Challenges & Solutions:**
  - **Challenge:** [description]
  - **Solution:** [what worked]

  **Notes:**
  - [any important implementation details]
</context_template>

<instructions>
  ACTION: Read existing context.md (create if doesn't exist)
  APPEND: New task implementation details
  FORMAT: Use context_template for each task
  PURPOSE: Build living documentation of feature implementation
</instructions>

</step>

<step number="8" name="task_status_updates">

### Step 8: Mark this task and sub-tasks complete (WITH TEST EVIDENCE VALIDATION)

**CRITICAL**: Before marking any task complete, VALIDATE that test evidence from Step 6 shows all tests passing.

<pre_completion_check>
  **MANDATORY VALIDATION before marking complete:**

  1. CHECK: Test evidence exists from Step 6
  2. VALIDATE: exit_code == 0
  3. VALIDATE: tests_failed == 0
  4. VALIDATE: tests_passed > 0
  5. VALIDATE: task_id matches current task

  IF any validation fails:
    - DO NOT mark task as complete
    - Return to Step 6 to fix and re-test
    - Document blocking issue if cannot resolve

  IF all validations pass:
    - Proceed with marking task complete
</pre_completion_check>

<update_format>
  <completed>- [x] Task description</completed>
  <incomplete>- [ ] Task description</incomplete>
  <blocked>
    - [ ] Task description
    ⚠️ Blocking issue: [DESCRIPTION]
  </blocked>
  <test_failed>
    - [ ] Task description
    ❌ Test failures: [NUMBER] tests failed - cannot complete
  </test_failed>
</update_format>

<blocking_criteria>
  <test_failure>Tests must pass before completion - no exceptions</test_failure>
  <attempts>maximum 3 different approaches for non-test issues</attempts>
  <action>document blocking issue</action>
  <emoji_blocked>⚠️</emoji_blocked>
  <emoji_test_fail>❌</emoji_test_fail>
</blocking_criteria>

<instructions>
  PRE-CHECK: Validate test evidence from Step 6
    IF no evidence OR exit_code != 0 OR tests_failed > 0:
      BLOCK: Do not proceed with completion
      RETURN: To Step 6 to fix and re-test

  ACTION: Update tasks.md after validation passes
  MARK: [x] for completed items immediately
  DOCUMENT: Test failures with ❌ emoji
  DOCUMENT: Other blocking issues with ⚠️ emoji
  LIMIT: 3 attempts before marking as blocked (except test failures - must fix)

  STATE_UPDATE: Update state.json
    - Add task number to completed_tasks array
    - Update key_files_modified with files changed

  FEATURES_JSON_UPDATE: If features.json exists
    - Update sub_feature.implemented = true
    - Update sub_feature.tested = true (only if test evidence valid)
    - Recalculate progress_summary
</instructions>

<state_update_example>
  {
    "completed_tasks": [1, 2],
    "active_task": 3,
    "key_files_modified": [
      "src/lib/auth/reset.ts",
      "src/routes/reset-password/+page.svelte",
      "src/lib/email/templates/reset.html"
    ]
  }
</state_update_example>

<features_json_update_example>
  // After task 1.1 completes with valid test evidence:
  {
    "sub_features": [
      {"id": "1.1", "name": "...", "implemented": true, "tested": true}
    ],
    "progress_summary": {
      "total_features": 10,
      "implemented": 1,
      "tested": 1,
      "completion_percentage": 10
    }
  }
</features_json_update_example>

</step>

</process_flow>

<post_flight_check>
  EXECUTE: @.yoyo-dev/instructions/meta/post-flight.md
</post_flight_check>
