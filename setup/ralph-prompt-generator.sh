#!/bin/bash

# Ralph PROMPT.md Generator for Yoyo Dev
# Generates command-specific PROMPT.md files for Ralph autonomous execution

set -euo pipefail

# ============================================================================
# Load UI Library
# ============================================================================

SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
    SCRIPT_PATH="$(readlink -f "$SCRIPT_PATH")"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

# Try to load UI library
if [ -f "$SCRIPT_DIR/ui-library.sh" ]; then
    source "$SCRIPT_DIR/ui-library.sh"
else
    UI_PRIMARY='\033[0;36m'
    UI_SUCCESS='\033[0;32m'
    UI_DIM='\033[2m'
    UI_RESET='\033[0m'
    ui_success() { echo -e "${UI_SUCCESS}✓${UI_RESET} $1"; }
    ui_error() { echo -e "\033[0;31m✗\033[0m $1"; }
    ui_info() { echo -e "${UI_PRIMARY}ℹ${UI_RESET} $1"; }
fi

# ============================================================================
# Configuration
# ============================================================================

COMMAND_TYPE=""
COMMAND_ARGS=""
OUTPUT_DIR=".yoyo-dev/ralph"
SPEC_DIR=""

# ============================================================================
# Argument Parsing
# ============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --command|-c)
            COMMAND_TYPE="$2"
            shift 2
            ;;
        --args|-a)
            COMMAND_ARGS="$2"
            shift 2
            ;;
        --spec-dir|-s)
            SPEC_DIR="$2"
            shift 2
            ;;
        --output|-o)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --help|-h)
            echo ""
            echo "Ralph PROMPT.md Generator"
            echo ""
            echo "Usage: ralph-prompt-generator.sh --command TYPE [OPTIONS]"
            echo ""
            echo "Commands:"
            echo "  execute-tasks    Generate for task execution"
            echo "  execute-phase    Generate for roadmap phase execution"
            echo "  resume-phase     Generate for resuming interrupted phase"
            echo "  create-spec      Generate for spec creation"
            echo "  create-fix       Generate for bug fix workflow"
            echo "  create-new       Generate for complete feature creation"
            echo ""
            echo "Options:"
            echo "  --command, -c    Command type (required)"
            echo "  --args, -a       Command arguments"
            echo "  --spec-dir, -s   Spec directory path"
            echo "  --output, -o     Output directory (default: .yoyo-dev/ralph)"
            echo "  --help, -h       Show this help"
            echo ""
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

# ============================================================================
# Spec Detection
# ============================================================================

# Find active/latest spec directory
find_active_spec() {
    if [ -n "$SPEC_DIR" ] && [ -d "$SPEC_DIR" ]; then
        echo "$SPEC_DIR"
        return
    fi

    # Look for specs with state.json status != "completed"
    local specs_dir=".yoyo-dev/specs"
    if [ -d "$specs_dir" ]; then
        # Get most recent spec directory
        local latest
        latest=$(ls -1td "$specs_dir"/*/ 2>/dev/null | head -1)
        if [ -n "$latest" ]; then
            echo "${latest%/}"
            return
        fi
    fi

    echo ""
}

# ============================================================================
# PROMPT.md Templates
# ============================================================================

generate_execute_tasks_prompt() {
    local spec_path="$1"
    local spec_lite="$spec_path/spec-lite.md"
    local tasks_file="$spec_path/tasks.md"

    cat << EOF
# Yoyo Dev - Autonomous Task Execution

## Context

You are running in autonomous mode via Ralph. Execute tasks systematically until completion.

## Current Specification

\`\`\`
Spec Directory: $spec_path
\`\`\`

Load the following files for context:
- Spec: \`$spec_lite\`
- Tasks: \`$tasks_file\`

## Instructions

1. Read the spec-lite.md to understand the feature
2. Read tasks.md to see all tasks
3. Execute each uncompleted task (marked with [ ]) in order
4. Follow TDD: write tests first, then implementation
5. Mark tasks as complete [x] when done
6. Run tests after each task group

## Exit Conditions

**SUCCESS - Exit when ALL conditions met:**
- All tasks in tasks.md marked [x] completed
- All tests passing
- No TypeScript errors
- Implementation matches spec requirements

**FAILURE - Exit on:**
- 3 consecutive loops without any task completion
- Tests failing after 3 fix attempts
- Spec requirements cannot be met

## Yoyo Dev Commands

Use these Claude Code commands:
- \`/execute-tasks\` - Execute current task group
- \`/tasks\` - View task progress
- \`/yoyo-status\` - Check overall status

## Progress Tracking

After each iteration:
1. Report which tasks were completed
2. Report current test status
3. Report remaining tasks count
4. State if ready to exit or continue

## Important Notes

- Do NOT skip tasks
- Do NOT mark tasks complete without actual implementation
- DO commit code after each successful task group
- DO run tests after each implementation
EOF
}

generate_create_spec_prompt() {
    local feature_desc="$1"

    cat << EOF
# Yoyo Dev - Autonomous Spec Creation

## Context

You are running in autonomous mode via Ralph. Create a comprehensive feature specification.

## Feature Description

$feature_desc

## Reference Files

Load these for context:
- Mission: \`.yoyo-dev/product/mission-lite.md\`
- Tech Stack: \`.yoyo-dev/product/tech-stack.md\`

## Instructions

1. Analyze the feature request
2. Research similar implementations in the codebase
3. Ask clarifying questions (use AskUserQuestion tool)
4. Create comprehensive spec.md with all sections
5. Generate spec-lite.md condensed version
6. Create initial task breakdown

## Spec Sections Required

- Overview
- Problem Statement
- Goals / Non-Goals
- User Stories
- Technical Design
- API Reference (if applicable)
- Testing Strategy
- Rollout Plan

## Exit Conditions

**SUCCESS - Exit when:**
- spec.md created with all required sections
- spec-lite.md generated
- User has reviewed and approved
- tasks.md created with strategic breakdown

**FAILURE - Exit on:**
- 5 iterations without significant progress
- User explicitly rejects spec
- Requirements fundamentally unclear after clarification

## Yoyo Dev Commands

Use these Claude Code commands:
- \`/create-spec\` - Refine specification
- \`/create-tasks\` - Generate task breakdown
- \`/spec\` - View current spec

## Progress Tracking

After each iteration:
1. Report spec sections completed
2. Report outstanding questions
3. Report user feedback status
4. State readiness for task generation
EOF
}

generate_create_fix_prompt() {
    local bug_desc="$1"

    cat << EOF
# Yoyo Dev - Autonomous Bug Fix

## Context

You are running in autonomous mode via Ralph. Analyze and fix the reported bug.

## Bug Description

$bug_desc

## Instructions

1. Understand the bug report
2. Search codebase for related code
3. Identify root cause
4. Create analysis document in .yoyo-dev/fixes/
5. Propose fix with tests
6. Implement fix following TDD
7. Verify fix resolves the issue

## Root Cause Analysis

Document in analysis.md:
- Symptoms observed
- Code paths involved
- Root cause identification
- Impact assessment
- Fix approach

## Exit Conditions

**SUCCESS - Exit when:**
- Root cause identified and documented
- Fix implemented
- Tests pass (including new regression test)
- Bug no longer reproducible

**FAILURE - Exit on:**
- Cannot reproduce bug after 3 attempts
- Root cause cannot be determined
- Fix attempts cause regressions

## Yoyo Dev Commands

Use these Claude Code commands:
- \`/create-fix\` - Continue fix workflow
- \`/fixes\` - View fix history
- \`/review --security\` - Security review if relevant

## Progress Tracking

After each iteration:
1. Report investigation findings
2. Report fix status (proposed/implementing/testing)
3. Report test results
4. State if bug is resolved or need more investigation
EOF
}

generate_execute_phase_prompt() {
    local phase_args="$1"

    # Parse JSON args
    local phase_id phase_title phase_goal phase_items
    phase_id=$(echo "$phase_args" | grep -o '"phaseId":"[^"]*"' | cut -d'"' -f4)
    phase_title=$(echo "$phase_args" | grep -o '"phaseTitle":"[^"]*"' | cut -d'"' -f4)
    phase_goal=$(echo "$phase_args" | grep -o '"phaseGoal":"[^"]*"' | cut -d'"' -f4)
    # Items are passed as a string with newlines
    phase_items=$(echo "$phase_args" | grep -o '"items":"[^"]*"' | cut -d'"' -f4 | sed 's/\\n/\n/g')

    cat << EOF
# Yoyo Dev - Autonomous Phase Execution

## Context

You are running in autonomous mode via Ralph. Execute all specifications and tasks for this roadmap phase.

## Phase Information

**Phase ID:** $phase_id
**Phase Title:** $phase_title
**Phase Goal:** $phase_goal

## Items to Execute

$phase_items

## Reference Files

Load these for context:
- Mission: \`.yoyo-dev/product/mission-lite.md\`
- Tech Stack: \`.yoyo-dev/product/tech-stack.md\`
- Roadmap: \`.yoyo-dev/product/roadmap.md\`

## Execution Workflow

For each item in the phase:

### Step 1: Check Spec Status
1. Search \`.yoyo-dev/specs/\` for existing spec matching item title
2. If spec exists, check for tasks.md
3. Report status: [HAS_SPEC], [HAS_TASKS], or [NEEDS_CREATION]

### Step 2: Create Missing Specs
If no spec exists:
1. Run \`/create-spec\` with item description
2. Wait for spec creation to complete
3. Report: [SPEC_CREATED] <spec-path>

### Step 3: Create Missing Tasks
If spec exists but no tasks.md:
1. Run \`/create-tasks\` for the spec
2. Wait for tasks creation to complete
3. Report: [TASKS_CREATED] <task-count>

### Step 4: Execute Tasks
For each spec with tasks:
1. Run \`/execute-tasks\` for the spec
2. Follow TDD approach
3. Mark tasks complete as implemented
4. Report progress: [TASK_COMPLETE] <task-name>
5. Report progress percentage: [PROGRESS] <percent>%

### Step 5: Verify Completion
After all tasks for a spec:
1. Run full test suite
2. Verify all tests pass
3. Update state.json
4. Report: [SPEC_COMPLETE] <spec-name>

## Progress Reporting

Use these markers for machine-readable output:
- \`[PROGRESS] XX%\` - Overall phase progress
- \`[TASK_COMPLETE] <task>\` - Individual task completed
- \`[SPEC_COMPLETE] <spec>\` - Entire spec finished
- \`[PHASE_STATUS] <status>\` - Phase status update

## Exit Conditions

**SUCCESS - Exit when ALL conditions met:**
- All items have specs created
- All specs have tasks created
- All tasks marked completed
- All tests passing

When complete, output exactly:
\`\`\`
PHASE COMPLETE: $phase_title
\`\`\`

**FAILURE - Exit on:**
- 5 consecutive loops without any task completion
- Tests failing after 3 fix attempts per spec
- Spec creation blocked (missing dependencies)

## Important Notes

- Execute items in order unless blocked
- Commit code after each spec completion
- Do NOT skip items
- Do NOT mark tasks complete without implementation
- Report progress after each significant milestone
EOF
}

generate_create_new_prompt() {
    local feature_desc="$1"

    cat << EOF
# Yoyo Dev - Autonomous Feature Creation

## Context

You are running in autonomous mode via Ralph. Create a complete feature from start to finish.

## Feature Description

$feature_desc

## Reference Files

Load these for context:
- Mission: \`.yoyo-dev/product/mission-lite.md\`
- Tech Stack: \`.yoyo-dev/product/tech-stack.md\`
- Roadmap: \`.yoyo-dev/product/roadmap.md\`

## Workflow Phases

### Phase 1: Specification (create-spec)
- Gather requirements
- Ask clarifying questions
- Create comprehensive spec.md
- Generate spec-lite.md

### Phase 2: Task Breakdown (create-tasks)
- Analyze spec requirements
- Create strategic task groups
- Identify dependencies
- Generate tasks.md

### Phase 3: Implementation (execute-tasks)
- Execute tasks in order
- Follow TDD practices
- Commit after each task group
- Run tests continuously

### Phase 4: Verification
- Run full test suite
- Verify all requirements met
- Create implementation recap

## Exit Conditions

**SUCCESS - Exit when:**
- Spec approved by user
- All tasks completed
- All tests passing
- Feature verified working

**FAILURE - Exit on:**
- User rejects spec after 3 revisions
- Implementation blocked for 5 loops
- Critical dependencies missing

## Yoyo Dev Commands

Use these sequentially:
1. \`/create-spec\` - Create specification
2. \`/create-tasks\` - Generate tasks
3. \`/execute-tasks\` - Implement feature

## Progress Tracking

After each iteration:
1. Report current phase (spec/tasks/implementation)
2. Report completion percentage
3. Report blockers or questions
4. State overall progress toward feature completion
EOF
}

generate_resume_phase_prompt() {
    local resume_args="$1"

    # Parse JSON args for resume context
    local phase_id phase_title last_task pending_specs progress
    phase_id=$(echo "$resume_args" | grep -o '"phaseId":"[^"]*"' | cut -d'"' -f4)
    phase_title=$(echo "$resume_args" | grep -o '"phaseTitle":"[^"]*"' | cut -d'"' -f4)
    last_task=$(echo "$resume_args" | grep -o '"lastTask":"[^"]*"' | cut -d'"' -f4)
    pending_specs=$(echo "$resume_args" | grep -o '"pendingSpecs":"[^"]*"' | cut -d'"' -f4 | sed 's/\\n/\n/g')
    progress=$(echo "$resume_args" | grep -o '"progress":"[^"]*"' | cut -d'"' -f4)

    cat << EOF
# Yoyo Dev - Resume Phase Execution

## Context

You are resuming a previously interrupted phase execution. The previous execution was paused or stopped.

## Resume Information

**Phase ID:** $phase_id
**Phase Title:** $phase_title
**Previous Progress:** $progress

## Last Completed Task

The last task that was being worked on before interruption:
\`\`\`
$last_task
\`\`\`

## Pending Specs (Remaining Work)

$pending_specs

## Reference Files

Load these for context:
- Mission: \`.yoyo-dev/product/mission-lite.md\`
- Tech Stack: \`.yoyo-dev/product/tech-stack.md\`
- Roadmap: \`.yoyo-dev/product/roadmap.md\`
- Execution State: \`.yoyo-dev/ralph/execution-state.json\`

## Resume Instructions

1. **Load State**
   - Read \`.yoyo-dev/ralph/execution-state.json\`
   - Verify which specs are completed vs pending
   - Identify current task index for running specs

2. **Verify Previous Work**
   - Check if the last task was actually completed (tests passing)
   - If incomplete, continue from that task
   - If complete, move to next task

3. **Continue Execution**
   - Resume from the first pending spec
   - Execute remaining tasks for each spec
   - Report progress with standard markers

## Progress Reporting

Use these markers for machine-readable output:
- \`[RESUME] Resuming from <task>\` - Initial resume marker
- \`[PROGRESS] XX%\` - Overall phase progress
- \`[TASK_COMPLETE] <task>\` - Individual task completed
- \`[SPEC_COMPLETE] <spec>\` - Entire spec finished
- \`[PHASE_STATUS] <status>\` - Phase status update

## State Verification

Before continuing:
1. Run tests to verify existing implementation
2. Check for any uncommitted changes
3. Verify task statuses in tasks.md match actual state

## Exit Conditions

**SUCCESS - Exit when ALL conditions met:**
- All pending specs have tasks created
- All tasks marked completed
- All tests passing

When complete, output exactly:
\`\`\`
PHASE COMPLETE: $phase_title
\`\`\`

**FAILURE - Exit on:**
- 5 consecutive loops without any task completion
- Tests failing after 3 fix attempts per spec
- State inconsistency detected (abort and report)

## Important Notes

- This is a RESUME - work already exists
- Verify before overwriting
- Check git status for uncommitted changes
- Report any state inconsistencies immediately
EOF
}

# ============================================================================
# Main
# ============================================================================

main() {
    if [ -z "$COMMAND_TYPE" ]; then
        ui_error "Command type required. Use --command TYPE"
        exit 1
    fi

    # Create output directory
    mkdir -p "$OUTPUT_DIR"

    local output_file="$OUTPUT_DIR/PROMPT.md"
    local spec_path
    spec_path=$(find_active_spec)

    case "$COMMAND_TYPE" in
        execute-tasks)
            if [ -z "$spec_path" ]; then
                ui_error "No active spec found. Create a spec first."
                exit 1
            fi
            generate_execute_tasks_prompt "$spec_path" > "$output_file"
            ;;
        execute-phase)
            generate_execute_phase_prompt "$COMMAND_ARGS" > "$output_file"
            ;;
        resume-phase)
            generate_resume_phase_prompt "$COMMAND_ARGS" > "$output_file"
            ;;
        create-spec)
            generate_create_spec_prompt "$COMMAND_ARGS" > "$output_file"
            ;;
        create-fix)
            generate_create_fix_prompt "$COMMAND_ARGS" > "$output_file"
            ;;
        create-new)
            generate_create_new_prompt "$COMMAND_ARGS" > "$output_file"
            ;;
        *)
            ui_error "Unknown command type: $COMMAND_TYPE"
            exit 1
            ;;
    esac

    ui_success "Generated PROMPT.md for $COMMAND_TYPE"
    echo "  Output: $output_file"
}

main "$@"
