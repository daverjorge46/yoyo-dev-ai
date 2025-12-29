# Todo Workflow Test Scenarios

**Purpose:** Manual test scenarios to verify the todo-driven workflow implementation in Yoyo-AI.

**Version:** 5.0.0
**Last Updated:** 2025-12-29

---

## Test Scenario 1: Todo Creation Before Work

**Objective:** Verify that Yoyo-AI creates todos BEFORE starting any implementation work.

**Steps:**
1. Start a new task with Yoyo-AI
2. Observe that TodoWrite is called BEFORE any Read/Write/Edit operations
3. Verify todos are created with all required fields (content, activeForm, status)
4. Verify all todos start with `status: "pending"`

**Expected Result:**
```typescript
TodoWrite({
  todos: [
    {
      content: "Gather context for feature",
      activeForm: "Gathering context for feature",
      status: "pending"
    },
    {
      content: "Implement core functionality",
      activeForm: "Implementing core functionality",
      status: "pending"
    },
    // ... more pending todos
  ]
})
```

**Pass Criteria:**
- ✓ TodoWrite called before implementation
- ✓ All todos have required fields
- ✓ All todos start as pending
- ✓ No work begins before todos created

---

## Test Scenario 2: Mark In-Progress Immediately

**Objective:** Verify that Yoyo-AI marks todos `in_progress` as soon as work begins on them.

**Steps:**
1. Observe first todo marked `in_progress` before starting work on it
2. Verify only ONE todo is `in_progress` at any time
3. Verify other todos remain `pending`
4. Check that in_progress status is set BEFORE any implementation code

**Expected Result:**
```typescript
// First todo marked in_progress
TodoWrite({
  todos: [
    {
      content: "Gather context for feature",
      activeForm: "Gathering context for feature",
      status: "in_progress"  // Changed from pending
    },
    {
      content: "Implement core functionality",
      activeForm: "Implementing core functionality",
      status: "pending"  // Still pending
    },
    // ... rest pending
  ]
})

// Then work begins:
// call_agent({ agent: "explore", ... })
// Read(...)
// etc.
```

**Pass Criteria:**
- ✓ Todo marked in_progress before work starts
- ✓ Only ONE todo in_progress at a time
- ✓ In-progress status set immediately (not delayed)

---

## Test Scenario 3: Mark Completed Immediately (Not Batched)

**Objective:** Verify that Yoyo-AI marks todos `completed` IMMEDIATELY after finishing each one, not batching multiple completions.

**Steps:**
1. Observe first todo completed
2. Verify TodoWrite is called IMMEDIATELY after that todo finishes
3. Verify completion is NOT delayed to batch with other completions
4. Verify next todo is then marked `in_progress`
5. Repeat for all todos

**Expected Result:**
```typescript
// First todo finishes - IMMEDIATE completion
TodoWrite({
  todos: [
    {
      content: "Gather context for feature",
      activeForm: "Gathering context for feature",
      status: "completed"  // Marked complete immediately
    },
    {
      content: "Implement core functionality",
      activeForm: "Implementing core functionality",
      status: "in_progress"  // Next one starts
    },
    // ... rest pending
  ]
})

// Second todo finishes - IMMEDIATE completion (not batched with first)
TodoWrite({
  todos: [
    {
      content: "Gather context for feature",
      activeForm: "Gathering context for feature",
      status: "completed"
    },
    {
      content: "Implement core functionality",
      activeForm: "Implementing core functionality",
      status: "completed"  // Marked complete immediately
    },
    {
      content: "Write tests",
      activeForm: "Writing tests",
      status: "in_progress"  // Next one starts
    },
    // ... rest pending
  ]
})
```

**Anti-Pattern (SHOULD NOT HAPPEN):**
```typescript
// ✗ WRONG - Batching multiple completions
TodoWrite({
  todos: [
    { content: "Task 1", status: "completed" },  // ✗ Batched
    { content: "Task 2", status: "completed" },  // ✗ Batched
    { content: "Task 3", status: "completed" },  // ✗ Batched
    { content: "Task 4", status: "in_progress" }
  ]
})
```

**Pass Criteria:**
- ✓ Each todo completed individually (not batched)
- ✓ TodoWrite called immediately after each task finishes
- ✓ No delays between completion and TodoWrite
- ✓ Next todo marked in_progress after previous completes

---

## Test Scenario 4: Todo Validation

**Objective:** Verify that all todos have required fields and valid values.

**Steps:**
1. Check every TodoWrite call
2. Verify each todo has: `content`, `activeForm`, `status`
3. Verify `status` is one of: `"pending"`, `"in_progress"`, `"completed"`
4. Verify `activeForm` uses present continuous tense (verb + "ing")
5. Verify `content` uses imperative form

**Expected Result:**
```typescript
// ✓ CORRECT
{
  content: "Implement auth service",        // Imperative
  activeForm: "Implementing auth service",  // Present continuous
  status: "pending"                         // Valid status
}
```

**Invalid Examples (SHOULD NOT HAPPEN):**
```typescript
// ✗ Missing activeForm
{
  content: "Implement auth service",
  status: "pending"  // Missing activeForm!
}

// ✗ Invalid status
{
  content: "Implement auth service",
  activeForm: "Implementing auth service",
  status: "done"  // Invalid! Must be: pending, in_progress, or completed
}

// ✗ Wrong activeForm tense
{
  content: "Implement auth service",
  activeForm: "Implement auth service",  // ✗ Not continuous tense
  status: "pending"
}
```

**Pass Criteria:**
- ✓ All todos have all three required fields
- ✓ All status values are valid
- ✓ All activeForm values use present continuous tense
- ✓ All content values use imperative form

---

## Test Scenario 5: Only One In-Progress at a Time

**Objective:** Verify that ONLY ONE todo is `in_progress` at any given time.

**Steps:**
1. Check every TodoWrite call
2. Count todos with `status: "in_progress"`
3. Verify count is exactly 1 (not 0, not 2+)
4. Verify previous in_progress todo is completed before next starts

**Expected Result:**
```typescript
// State 1: First todo in progress
TodoWrite({
  todos: [
    { content: "Task 1", status: "in_progress" },  // 1 in_progress
    { content: "Task 2", status: "pending" },
    { content: "Task 3", status: "pending" }
  ]
})

// State 2: First completes, second starts
TodoWrite({
  todos: [
    { content: "Task 1", status: "completed" },
    { content: "Task 2", status: "in_progress" },  // 1 in_progress
    { content: "Task 3", status: "pending" }
  ]
})
```

**Anti-Patterns (SHOULD NOT HAPPEN):**
```typescript
// ✗ WRONG - Multiple in_progress
TodoWrite({
  todos: [
    { content: "Task 1", status: "in_progress" },  // ✗ 2 in_progress!
    { content: "Task 2", status: "in_progress" },  // ✗ Not allowed
    { content: "Task 3", status: "pending" }
  ]
})

// ✗ WRONG - No in_progress (when work is ongoing)
TodoWrite({
  todos: [
    { content: "Task 1", status: "completed" },
    { content: "Task 2", status: "pending" },  // ✗ Should be in_progress
    { content: "Task 3", status: "pending" }
  ]
})
// ... agent continues working without marking anything in_progress
```

**Pass Criteria:**
- ✓ Exactly ONE todo is in_progress at all times (when work is ongoing)
- ✓ Previous todo completed before next marked in_progress
- ✓ No gaps where no todo is in_progress while work continues

---

## Test Scenario 6: End-to-End Workflow

**Objective:** Verify the complete todo workflow from start to finish.

**Steps:**
1. Start with all todos pending
2. Progress through each todo sequentially
3. Mark each in_progress before work
4. Complete each immediately after work
5. End with all todos completed

**Expected Progression:**
```typescript
// Initial state
TodoWrite({
  todos: [
    { content: "Context", status: "pending" },
    { content: "Implement", status: "pending" },
    { content: "Test", status: "pending" }
  ]
})

// State 1: Start first
TodoWrite({
  todos: [
    { content: "Context", status: "in_progress" },
    { content: "Implement", status: "pending" },
    { content: "Test", status: "pending" }
  ]
})

// State 2: Complete first, start second
TodoWrite({
  todos: [
    { content: "Context", status: "completed" },
    { content: "Implement", status: "in_progress" },
    { content: "Test", status: "pending" }
  ]
})

// State 3: Complete second, start third
TodoWrite({
  todos: [
    { content: "Context", status: "completed" },
    { content: "Implement", status: "completed" },
    { content: "Test", status: "in_progress" }
  ]
})

// Final state: All complete
TodoWrite({
  todos: [
    { content: "Context", status: "completed" },
    { content: "Implement", status: "completed" },
    { content: "Test", status: "completed" }
  ]
})
```

**Pass Criteria:**
- ✓ Starts with all pending
- ✓ Each todo goes through: pending → in_progress → completed
- ✓ No todos skipped
- ✓ Ends with all completed
- ✓ Sequential progression (no jumping around)

---

## Test Execution Checklist

**How to Run These Tests:**

1. Start a feature implementation task with Yoyo-AI
2. Observe TodoWrite calls in the conversation
3. Verify each scenario's pass criteria
4. Document any failures
5. Repeat with different task types (feature, fix, documentation)

**Test Results Template:**
```markdown
## Test Run: YYYY-MM-DD

### Scenario 1: Todo Creation Before Work
- [ ] TodoWrite called before implementation
- [ ] All todos have required fields
- [ ] All todos start as pending
- [ ] No work begins before todos created

### Scenario 2: Mark In-Progress Immediately
- [ ] Todo marked in_progress before work starts
- [ ] Only ONE todo in_progress at a time
- [ ] In-progress status set immediately

### Scenario 3: Mark Completed Immediately
- [ ] Each todo completed individually (not batched)
- [ ] TodoWrite called immediately after each task finishes
- [ ] Next todo marked in_progress after previous completes

### Scenario 4: Todo Validation
- [ ] All todos have all three required fields
- [ ] All status values are valid
- [ ] All activeForm values use present continuous tense

### Scenario 5: Only One In-Progress
- [ ] Exactly ONE todo is in_progress at all times
- [ ] Previous todo completed before next marked in_progress

### Scenario 6: End-to-End Workflow
- [ ] Starts with all pending
- [ ] Sequential progression
- [ ] Ends with all completed

**Overall Result:** PASS / FAIL
**Notes:** [any observations or issues]
```

---

## Known Limitations

**Not Tested:**
- TodoWrite tool implementation (Claude Code internal)
- TUI dashboard todo display (manual UI testing required)
- Todo continuation hook (separate test file)

**Requires Manual Verification:**
- Visual inspection of TodoWrite calls
- Timing of completions (immediate vs batched)
- Agent behavior in edge cases

---

## Related Files

- `.claude/agents/yoyo-ai.md` - Yoyo-AI todo workflow instructions
- `src/hooks/todo-continuation-enforcer.ts` - Auto-continuation hook
- Task 5.2 in `.yoyo-dev/specs/2025-12-29-multi-agent-orchestration/tasks.md`

---

**Status:** Test scenarios defined ✓
**Next Steps:** Run manual tests during actual feature implementation
