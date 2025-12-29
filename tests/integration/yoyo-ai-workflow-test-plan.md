# Yoyo-AI End-to-End Workflow Test Plan

**Task:** 5.6 - Test End-to-End Workflow
**Purpose:** Verify the complete Yoyo-AI orchestration system works as designed
**Version:** 5.0.0
**Last Updated:** 2025-12-29

---

## Overview

This test plan validates all Phase 5 components working together:
- Todo-driven workflow (Task 5.2)
- Todo continuation hook (Task 5.3)
- Failure recovery with Oracle escalation (Task 5.4)
- Frontend delegation gate (Task 5.5)
- Background task management (Phase 3)
- Multi-agent communication (Phase 2)

---

## Test Scenario 1: Simple Feature Creation

**Objective:** Verify basic orchestration workflow without delegation.

### Setup
- Clean project state
- No pending tasks
- All agents available

### Test Steps

1. **Start feature creation**
   ```
   /create-new "Add email validation to signup form"
   ```

2. **Expected: Todo Creation Phase**
   - Verify TodoWrite called BEFORE any implementation
   - Verify all todos have required fields (content, activeForm, status)
   - Verify all todos start with `status: "pending"`

3. **Expected: Codebase Assessment**
   - Verify explore agent called to find existing validation patterns
   - Verify context gathered before implementation

4. **Expected: Implementation Phase**
   - Verify first todo marked `in_progress`
   - Verify TDD approach (tests written first)
   - Verify each todo completed immediately (not batched)

5. **Expected: Quality Gates**
   - Verify all tests run
   - Verify type checking passed
   - Verify no syntax errors

6. **Expected: Git Workflow**
   - Verify git-workflow agent creates commit
   - Verify commit message follows convention
   - Verify PR created (if configured)

### Pass Criteria

- ✓ Todos created before work
- ✓ Sequential progression through todos
- ✓ All todos completed
- ✓ Tests pass
- ✓ Code committed

### Expected Duration
5-10 minutes

---

## Test Scenario 2: Frontend Delegation

**Objective:** Verify automatic delegation to frontend-engineer for UI work.

### Setup
- Clean project state
- Frontend-engineer agent available

### Test Steps

1. **Start UI feature**
   ```
   /create-new "Update button styling to match design system"
   ```

2. **Expected: Frontend Detection**
   - Verify `isFrontendWork()` detects UI keywords: "button", "styling", "design"
   - Verify Yoyo-AI logs: `[Frontend Detection] Auto-delegating to frontend-engineer`

3. **Expected: Delegation to Frontend-Engineer**
   - Verify `call_agent` with `agent: "frontend-engineer"`
   - Verify context passed to frontend-engineer:
     - Design system info
     - Component patterns
     - Accessibility requirements
   - Verify timeout set to 180000 (3 minutes)

4. **Expected: Frontend-Engineer Implementation**
   - Frontend-engineer implements UI changes
   - Frontend-engineer writes tests
   - Frontend-engineer marks todo complete

5. **Expected: No Manual Implementation**
   - Verify Yoyo-AI does NOT implement UI changes manually
   - Verify delegation happened immediately upon detection

### Test with --no-delegation Flag

6. **Test override**
   ```
   /create-new "Update button styling" --no-delegation
   ```

7. **Expected: No Delegation**
   - Verify `isFrontendWork()` still detects frontend work
   - Verify Yoyo-AI logs: `[Frontend Detection] Skipping delegation (--no-delegation flag)`
   - Verify Yoyo-AI implements changes manually

### Pass Criteria

- ✓ Frontend work detected automatically
- ✓ Delegation to frontend-engineer occurs
- ✓ Context passed correctly
- ✓ --no-delegation flag bypasses delegation
- ✓ Implementation completes successfully

### Expected Duration
3-8 minutes

---

## Test Scenario 3: Background Research with Librarian

**Objective:** Verify background task management with librarian agent.

### Setup
- Clean project state
- Librarian agent available
- Internet connection active

### Test Steps

1. **Start feature requiring research**
   ```
   /create-new "Implement rate limiting for API endpoints"
   ```

2. **Expected: Background Research Launch**
   - Verify `background_task` called with:
     ```typescript
     {
       agent: "librarian",
       prompt: "Research rate limiting best practices...",
       notification: true
     }
     ```
   - Verify research launches in background (non-blocking)

3. **Expected: Parallel Execution**
   - Verify Yoyo-AI continues with codebase assessment while librarian researches
   - Verify background task ID returned
   - Verify TUI shows background task indicator

4. **Expected: Research Completion**
   - Verify librarian returns research findings
   - Verify notification when research completes
   - Verify Yoyo-AI incorporates findings into implementation

5. **Expected: Implementation Uses Research**
   - Verify implementation follows best practices from research
   - Verify research results referenced in code comments or decisions

### Pass Criteria

- ✓ Background task launched
- ✓ Parallel execution confirmed
- ✓ Research completes successfully
- ✓ Findings incorporated into implementation
- ✓ TUI shows background task status

### Expected Duration
5-15 minutes (depending on research depth)

---

## Test Scenario 4: Failure Recovery with Oracle Escalation

**Objective:** Verify 3-failure escalation to Oracle for strategic guidance.

### Setup
- Clean project state
- Oracle agent available
- Intentionally create failing scenario (e.g., complex integration)

### Test Steps

1. **Start challenging feature**
   ```
   /create-new "Integrate third-party OAuth provider"
   ```

2. **Simulate 1st Failure**
   - Implementation attempt fails (test failure, build error, etc.)
   - **Expected: Retry with improved approach**
     - Verify Yoyo-AI analyzes error message
     - Verify Yoyo-AI reviews documentation
     - Verify Yoyo-AI tries same approach with fixes
     - Verify failure count incremented (mental state)

3. **Simulate 2nd Failure**
   - Second attempt still fails
   - **Expected: Try completely different approach**
     - Verify Yoyo-AI acknowledges current approach isn't working
     - Verify Yoyo-AI searches codebase for similar implementations
     - Verify Yoyo-AI tries fundamentally different strategy
     - Verify failure count = 2

4. **Simulate 3rd Failure**
   - Third attempt fails
   - **Expected: Oracle Escalation**
     - Verify `call_agent` with `agent: "oracle"`
     - Verify escalation prompt includes:
       - Task description
       - All 3 failure attempts with errors
       - All 3 approaches tried
       - Code context
       - Test output
     - Verify timeout = 120000 (2 minutes)
     - Verify format = "json"

5. **Expected: Oracle Response**
   - Oracle analyzes root cause
   - Oracle provides strategic recommendation
   - Verify Yoyo-AI logs: `[Oracle Recommendation]`
   - Verify Yoyo-AI applies Oracle's guidance

6. **Expected: Success After Oracle**
   - Implementation follows Oracle's recommendation
   - Tests pass
   - Verify failure count reset to 0
   - Verify todo marked complete

### Failure History Tracking

Verify failure history structure:
```typescript
failureHistory = [
  {
    error: "Expected 200, got 401",
    approach: "Manual token generation",
    outcome: "Authentication still failing",
    timestamp: "2025-12-29T10:30:00Z"
  },
  {
    error: "Token rejected by OAuth provider",
    approach: "Used library instead of custom implementation",
    outcome: "Library version incompatible",
    timestamp: "2025-12-29T10:35:00Z"
  },
  {
    error: "Scope permissions missing",
    approach: "Updated OAuth scopes",
    outcome: "Still failing with 403",
    timestamp: "2025-12-29T10:40:00Z"
  }
]
```

### Pass Criteria

- ✓ 1st failure: Retry with improved approach
- ✓ 2nd failure: Try different approach
- ✓ 3rd failure: Oracle escalation triggered
- ✓ Failure history documented
- ✓ Oracle recommendation applied
- ✓ Success after Oracle guidance
- ✓ Failure count reset on success

### Expected Duration
10-20 minutes

---

## Test Scenario 5: Todo Continuation Hook

**Objective:** Verify automatic continuation when session goes idle with incomplete todos.

### Setup
- Clean project state
- Todo continuation hook enabled
- Create scenario with multiple todos

### Test Steps

1. **Start multi-step task**
   ```
   /create-new "Add user profile page"
   ```

2. **Expected: Multiple Todos Created**
   - Verify TodoWrite creates 3+ todos
   - Verify all start as `pending`

3. **Complete First Todo, Then Go Idle**
   - Allow Yoyo-AI to complete first todo
   - Stop providing input (simulate idle session)

4. **Expected: Idle Detection**
   - After ~1 second idle, session.idle event fires
   - Hook detects idle state
   - Hook checks for incomplete todos

5. **Expected: Countdown Started**
   - Verify log: `[Todo Continuation] Starting 2000ms countdown`
   - Wait 2 seconds

6. **Expected: Continuation Message Injected**
   - Verify log: `[Todo Continuation] Countdown expired, injecting message`
   - Verify message format:
     ```
     [SYSTEM REMINDER - TODO CONTINUATION]

     Incomplete tasks remain in your todo list:
     - 1 in progress
     - 2 pending

     Next incomplete task:
     Implement profile data fetching

     **Action Required:**
     1. Continue working on the next pending task
     2. Mark each task complete when finished
     3. Do not stop until all tasks are done
     ```

7. **Expected: Agent Resumes Work**
   - Verify Yoyo-AI continues without user prompt
   - Verify next todo marked `in_progress`
   - Verify work proceeds automatically

8. **Test Cooldown Period**
   - Go idle again immediately after injection
   - **Expected:** Cooldown active, no duplicate injection
   - Verify log: `[Todo Continuation] Cooldown active, skipping`
   - Wait 3 seconds for cooldown to expire
   - Go idle again
   - **Expected:** New injection after cooldown expires

9. **Test Cancel on Activity**
   - Start countdown (go idle)
   - Before countdown completes, execute a tool
   - **Expected:** Countdown cancelled
   - Verify log: `[Todo Continuation] Cancelling countdown`
   - Verify no injection occurs

### Pass Criteria

- ✓ Idle detection works
- ✓ Incomplete todos detected
- ✓ 2-second countdown works
- ✓ Continuation message injected
- ✓ Agent resumes work automatically
- ✓ Cooldown prevents spam (3 seconds)
- ✓ Countdown cancels on activity

### Expected Duration
5-10 minutes

---

## Test Scenario 6: Complete Quality Gates

**Objective:** Verify all quality gates execute before task completion.

### Setup
- Clean project state
- All verification tools available

### Test Steps

1. **Start comprehensive feature**
   ```
   /create-new "Add user authentication with email/password"
   ```

2. **Expected Quality Gates (in order):**

   **Gate 1: Functionality**
   - Verify implementation matches spec
   - Verify all acceptance criteria met
   - Verify edge cases handled

   **Gate 2: Type Safety**
   - Verify `npm run typecheck` or `tsc --noEmit` runs
   - Verify no TypeScript errors
   - Verify types exported correctly

   **Gate 3: Testing**
   - Verify test-runner agent called
   - Verify unit tests pass
   - Verify integration tests pass
   - Verify coverage meets threshold (if configured)

   **Gate 4: Accessibility**
   - Verify WCAG 2.1 AA compliance
   - Verify keyboard navigation works
   - Verify screen reader support
   - Verify ARIA labels present

   **Gate 5: Performance**
   - Verify no performance regressions
   - Verify bundle size acceptable
   - Verify no memory leaks

   **Gate 6: Security**
   - Verify no hardcoded secrets
   - Verify input validation
   - Verify XSS prevention
   - Verify SQL injection prevention

   **Gate 7: Code Quality**
   - Verify follows project style guide
   - Verify linting passes
   - Verify no console.log statements
   - Verify naming conventions followed

   **Gate 8: Documentation**
   - Verify README updated (if needed)
   - Verify inline comments for complex logic
   - Verify JSDoc/TSDoc for public APIs

3. **Expected: All Gates Must Pass**
   - If any gate fails, implementation revised
   - Verify retry until all gates pass
   - Verify no shortcuts taken

### Pass Criteria

- ✓ All 8 quality gates execute
- ✓ All gates pass before completion
- ✓ Failed gates trigger revision
- ✓ Documentation updated
- ✓ Code meets all standards

### Expected Duration
10-20 minutes

---

## Test Scenario 7: Complex Multi-Agent Workflow

**Objective:** Verify all agents work together in a complex scenario.

### Setup
- Clean project state
- All agents available
- Complex feature with multiple delegation opportunities

### Test Steps

1. **Start complex feature**
   ```
   /create-new "Build admin dashboard with charts and user management"
   ```

2. **Expected Agent Orchestration:**

   **Yoyo-AI (Orchestrator):**
   - Creates comprehensive todo list
   - Coordinates all other agents
   - Manages task progression

   **Oracle (Strategic Guidance):**
   - Consulted for architecture decisions
   - Provides dashboard layout recommendations
   - Advises on data visualization patterns

   **Librarian (Research):**
   - Background: Research chart libraries (D3.js, Chart.js, Recharts)
   - Background: User management best practices
   - Web search for design patterns

   **Explore (Codebase Search):**
   - Find existing dashboard components
   - Find authentication patterns
   - Find table components

   **Frontend-Engineer (UI Implementation):**
   - Delegates all UI components
   - Charts styling
   - Responsive layout
   - Accessibility compliance

   **Document-Writer (Documentation):**
   - Delegates README updates
   - API documentation
   - User guide creation

3. **Expected Workflow:**
   ```
   1. Yoyo-AI: Create todos
   2. Yoyo-AI → Oracle: Architecture consultation
   3. Yoyo-AI → Librarian (background): Research chart libraries
   4. Yoyo-AI → Explore: Find existing patterns
   5. Yoyo-AI: Implement backend logic
   6. Yoyo-AI → Frontend-Engineer: Delegate UI components
   7. Yoyo-AI → Test-Runner: Run tests
   8. Yoyo-AI → Document-Writer: Update documentation
   9. Yoyo-AI → Git-Workflow: Commit and PR
   ```

4. **Verify Delegation Rules:**
   - No delegation cycles (A→B→A)
   - Sufficient context in all delegation prompts
   - Appropriate timeouts set
   - Error handling for agent failures

### Pass Criteria

- ✓ All agents called appropriately
- ✓ No delegation cycles
- ✓ Context passed correctly
- ✓ Background tasks work
- ✓ Feature completes successfully
- ✓ All quality gates pass

### Expected Duration
20-40 minutes

---

## Integration Test Checklist

### Pre-Test Verification

- [ ] All Phase 1 agents created
- [ ] All Phase 2 agent communication tools available
- [ ] Phase 3 background task system functional
- [ ] Phase 4 TUI enhancements working
- [ ] Phase 5 yoyo-ai.md instructions complete

### Test Execution

- [ ] Scenario 1: Simple Feature Creation
- [ ] Scenario 2: Frontend Delegation
- [ ] Scenario 3: Background Research
- [ ] Scenario 4: Failure Recovery
- [ ] Scenario 5: Todo Continuation
- [ ] Scenario 6: Quality Gates
- [ ] Scenario 7: Complex Multi-Agent Workflow

### Post-Test Validation

- [ ] All todos completed
- [ ] All tests passing
- [ ] No agent errors
- [ ] Performance acceptable
- [ ] Documentation updated

---

## Known Limitations

**Manual Testing Required:**
- TUI visual output (requires human observation)
- Agent behavior nuances
- Oracle strategic guidance quality
- Frontend-engineer UI quality

**Not Tested:**
- Network failures
- Agent timeout scenarios
- Extreme edge cases
- Load testing (100+ concurrent tasks)

---

## Test Result Template

```markdown
## Test Run: YYYY-MM-DD HH:MM

### Environment
- Yoyo Dev Version: 5.0.0
- Node Version: X.X.X
- OS: Linux/macOS/Windows

### Scenario 1: Simple Feature Creation
- Status: PASS / FAIL
- Duration: X minutes
- Notes:

### Scenario 2: Frontend Delegation
- Status: PASS / FAIL
- Duration: X minutes
- Notes:

### Scenario 3: Background Research
- Status: PASS / FAIL
- Duration: X minutes
- Notes:

### Scenario 4: Failure Recovery
- Status: PASS / FAIL
- Duration: X minutes
- Notes:

### Scenario 5: Todo Continuation
- Status: PASS / FAIL
- Duration: X minutes
- Notes:

### Scenario 6: Quality Gates
- Status: PASS / FAIL
- Duration: X minutes
- Notes:

### Scenario 7: Complex Multi-Agent Workflow
- Status: PASS / FAIL
- Duration: X minutes
- Notes:

### Overall Result
- Pass Rate: X/7 scenarios
- Total Duration: X minutes
- Issues Found: [list]
- Recommendations: [list]
```

---

## Success Criteria

**Phase 5 Complete when:**
- ✓ All 7 test scenarios pass
- ✓ No critical bugs found
- ✓ Performance acceptable (<2x baseline)
- ✓ All delegation rules work
- ✓ Quality gates enforce standards
- ✓ Documentation updated

---

## Related Files

- `.claude/agents/yoyo-ai.md` - Main orchestrator instructions
- `src/hooks/todo-continuation-enforcer.ts` - Auto-continuation hook
- `src/__tests__/todo-workflow.test.md` - Todo workflow test scenarios
- `.yoyo-dev/specs/2025-12-29-multi-agent-orchestration/tasks.md` - Full task breakdown

---

**Status:** Test plan defined ✓
**Next Steps:** Execute manual integration tests
**Estimated Time:** 2-3 hours for complete test suite
