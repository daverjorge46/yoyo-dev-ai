# Phase 2 Features: Usage Guide

**Status:** Infrastructure Complete
**Version:** 1.6.0
**Date:** 2025-10-30

## Overview

Phase 2 infrastructure is complete. The verification workflows and implementation tracking capabilities are available via the specialized agents. Full automation into `/execute-tasks` workflow is deferred for future iteration.

## Available Features

### 1. Verification Workflows

**What:** Systematic quality verification before marking tasks complete

**How to Use:**
```bash
# Invoke the implementation-verifier agent via Task tool
Use Task tool with subagent_type="implementation-verifier"

# The agent will run all 6 verification workflows:
# - verify-functionality.md
# - verify-tests.md
# - verify-accessibility.md
# - verify-performance.md
# - verify-security.md
# - verify-documentation.md
```

**Output:**
Creates `verification/final-verification.md` with comprehensive quality report

**When to Use:**
- Before marking tasks as complete
- Before creating pull requests
- Pre-deployment quality checks
- Systematic QA for features

---

### 2. Implementation Tracking

**What:** Detailed per-task implementation reports

**How to Use:**
```bash
# Manually create implementation/ folder in spec directory
mkdir .yoyo-dev/specs/YYYY-MM-DD-feature-name/implementation/

# Create reports for each task group
# Use template from technical-spec.md
```

**Report Template:**
```markdown
# Implementation Report: Task Group N - Name

**Status:** ✅ Completed
**Agent:** implementer
**Date:** YYYY-MM-DD

## Implementation Approach
[Descriptionof approach taken]

## Key Decisions
- Decision 1
- Decision 2

## Files Created
- path/to/file.ts - Description

## Files Modified
- path/to/file.ts - Changes made

## Tests Added
1. Test description
2. Test description

**Coverage:** X%

## Challenges Encountered
[Any challenges and how resolved]

## Time
**Estimated:** X min | **Actual:** Y min | **Variance:** ±Z min
```

**When to Use:**
- Complex multi-task implementations
- When detailed tracking needed
- For stakeholder reporting
- Post-mortem analysis

---

## Agents Available

### implementation-verifier
**Purpose:** Verify implementation completeness and quality

**Invocation:**
```
Use Task tool:
  subagent_type: implementation-verifier
  description: "Verify implementation quality"
  prompt: "Run complete verification for [spec-name] implementation.
           Check all 6 verification categories and create final report."
```

**Output:**
- Comprehensive verification report
- Pass/fail for each category
- Issues found with severity
- Recommendations

---

### implementer
**Purpose:** Execute TDD-based task implementation

**Invocation:**
```
Use Task tool:
  subagent_type: implementer
  description: "Implement task group"
  prompt: "Implement Task Group [N]: [Name] from [spec-folder]/tasks.md.
           Follow TDD approach, create tests first.
           [Optional: Create implementation report in implementation/ folder]"
```

**Output:**
- Task implementation complete
- Tests passing
- Optional implementation report

---

## Verification Workflow Details

### verify-functionality.md
**Checks:**
- All features work as specified
- All user stories implemented
- All acceptance criteria met
- Edge cases handled
- Error states work
- Loading states work
- No critical bugs

---

### verify-tests.md
**Checks:**
- All tests pass (unit + integration + E2E)
- Coverage ≥ 80% for new code
- Coverage ≥ 50% overall
- Edge cases tested
- Error scenarios tested
- Integration tests for critical paths

---

### verify-accessibility.md
**Checks:**
- WCAG AA compliance
- Color contrast ≥ 4.5:1 (normal text)
- Color contrast ≥ 3:1 (large text)
- Focus states visible on interactive elements
- Keyboard navigation works
- Screen reader compatible
- ARIA labels correct
- Semantic HTML used

---

### verify-performance.md
**Checks:**
- No performance regressions
- Page load time < 3s
- Time to Interactive < 5s
- Bundle size within budgets
- No memory leaks
- No unnecessary re-renders
- Database queries optimized
- API calls optimized

---

### verify-security.md
**Checks:**
- No security vulnerabilities
- Authentication correct
- Authorization checks present
- Input validation comprehensive
- Output sanitization present
- XSS protection in place
- CSRF protection in place
- No sensitive data in client code
- Dependencies free of known CVEs

**CRITICAL:** Blocks completion if issues found

---

### verify-documentation.md
**Checks:**
- Code documented with clear comments
- README updated with new features
- API documentation current
- Breaking changes documented
- Migration guide provided (if needed)
- Examples included for complex features

---

## Integration with Workflows

The verification and implementation agents reference these workflows:

```yaml
# implementation-verifier agent references:
{{workflows/implementation/verification/verify-functionality.md}}
{{workflows/implementation/verification/verify-tests.md}}
{{workflows/implementation/verification/verify-accessibility.md}}
{{workflows/implementation/verification/verify-performance.md}}
{{workflows/implementation/verification/verify-security.md}}
{{workflows/implementation/verification/verify-documentation.md}}

# implementer agent references:
{{workflows/implementation/implement-tasks.md}}
```

Workflow content is expanded inline when agent executes.

---

## Future Automation (Deferred)

**Phase 3 (Future):**
- Automatic verification in `/execute-tasks` post-execution phase
- Automatic implementation reports with `--implementation-reports` flag
- Integration into post-execution-tasks.md instruction file
- Command-line flags for verification control

**Current Status:**
Infrastructure complete, manual invocation available, automation deferred.

---

## Examples

### Example 1: Pre-PR Verification

```bash
# After completing task implementation, verify quality:

1. Use Task tool
2. subagent_type: implementation-verifier
3. prompt: "Run complete verification for user-profile-feature.
            Create verification report in .yoyo-dev/specs/2025-10-30-user-profile/verification/"

4. Review verification/final-verification.md
5. Fix any issues found
6. Re-run verification until all checks pass
7. Create pull request
```

---

### Example 2: Detailed Implementation Tracking

```bash
# For complex features requiring detailed tracking:

1. Create implementation/ folder in spec directory
2. After completing each task group, create implementation report
3. Use template from technical-spec.md
4. Document approach, decisions, files, tests, challenges
5. Track actual vs estimated time
6. Use reports for retrospectives and stakeholder updates
```

---

## Configuration

Verification and implementation tracking controlled in `config.yml`:

```yaml
workflows:
  task_execution:
    implementation_reports: false  # Manual creation
    verification_reports: true     # Enabled

specialized_agents:
  implementer: true
  implementation_verifier: true
```

---

## Related Documentation

- **Workflows:** `workflows/README.md`
- **Agents:** `.yoyo-dev/claude-code/agents/`
- **Technical Spec:** `.yoyo-dev/specs/2025-10-30-command-workflow-integration/sub-specs/technical-spec.md`
- **Main Documentation:** `CLAUDE.md`

---

## Notes

- Verification workflows enforce quality gates
- Implementation reports provide detailed tracking
- Both features available via agents
- Automation into `/execute-tasks` is future work
- Current approach: explicit agent invocation via Task tool
