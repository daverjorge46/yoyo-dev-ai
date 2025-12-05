---
description: Common Pre-Flight Steps for Yoyo Dev Instructions
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Pre-Flight Rules

## Execution Rules

- IMPORTANT: For any step that specifies a subagent in the subagent="" XML attribute you MUST use the specified subagent to perform the instructions for that step.

- Process XML blocks sequentially

- Read and execute every numbered step in the process_flow EXACTLY as the instructions specify.

- If you need clarification on any details of your current task, stop and ask the user specific numbered questions and then continue once you have all of the information you need.

- Use exact templates as provided

## Session Recovery Check

Before starting any task execution workflow, check for incomplete work from previous sessions:

<session_recovery_preflight>

### 1. Check for Active Spec

IF spec context is provided:
  - Read state.json to check current_phase and active_task
  - If active_task is set, this may be a resumed session

### 2. Git History Analysis

Run quick git log check for session state:

```bash
git log --oneline -20 | grep -E "^\w+ \[(FEATURE|TESTED|PARTIAL)\]"
```

IF task-related commits found:
  - Extract most recent task status
  - Identify any [PARTIAL] tasks (incomplete work)
  - Note potential resume point

### 3. Cross-Reference State Files

IF features.json exists in spec folder:
  - Check progress_summary.completion_percentage
  - Identify features where implemented=true but tested=false
  - These may be incomplete from previous session

IF tasks.md exists:
  - Count completed vs uncompleted tasks
  - Find first uncompleted task

### 4. Report Recovery State

IF incomplete work detected:
  OUTPUT:
  ```
  ⚠️ Previous session work detected:
  - Last activity: [COMMIT_HASH] [PREFIX] task-X.Y
  - Incomplete tasks: [LIST]
  - Suggested resume point: Task X.Y
  ```
  PROCEED: Let main workflow handle recovery

IF no incomplete work:
  NOTE: "Clean slate - no prior incomplete work"
  PROCEED: Normal execution

</session_recovery_preflight>

## Identity Loading (Session Continuity)

At the start of each session, establish identity context:

<identity_loading>

### 1. Load Consciousness Document

IF `.yoyo-dev/identity/consciousness.md` exists:
  - Read consciousness.md
  - Note: Self-concept, values, collaborative principles
  - APPLY: These inform communication style and decision-making

IF not exists:
  - NOTE: "Identity document not found - proceeding without consciousness context"
  - FALLBACK: Use default collaborative behavior

### 2. Load Recent Reflections

IF `.yoyo-dev/reflections/` has entries:
  - Read most recent 2-3 reflection entries
  - Note: Recent decisions, learnings, uncertainties
  - APPLY: Continuity of context across sessions

IF no reflections:
  - NOTE: "No prior reflections - starting fresh"

### 3. Generate Continuity Greeting

IF resuming work (state.json has active_task OR git has recent task commits):
  ```
  "Let's continue our work on [SPEC_NAME].
   I'm picking up from Task [X.Y] where we last left off."
  ```

IF starting fresh:
  ```
  "Let's get started on [SPEC_NAME].
   I'll follow our established patterns and values."
  ```

</identity_loading>

## State File Integrity

Before modifying any state files (features.json, state.json, tasks.md):
- Read current content first
- Preserve existing data not being updated
- Validate JSON structure after modification
