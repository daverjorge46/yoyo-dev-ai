---
description: Common Post-Flight Steps for Yoyo Dev Instructions
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Post-Flight Rules

After completing all steps in a process_flow, always review your work and verify:

- Every numbered step has read, executed, and delivered according to its instructions.

- All steps that specified a subagent should be used, did in fact delegate those tasks to the specified subagent.  IF they did not, see why the subagent was not used and report your findings to the user.

- IF you notice a step wasn't executed according to its instructions, report your findings and explain which part of the instructions were misread or skipped and why.

## Reflection Check

After significant work completion, evaluate whether a reflection entry is warranted.

### Reflection Trigger Criteria

**Generate a reflection if ANY of these apply:**

1. **Major Feature Completion** - Completed a parent task with multiple subtasks
2. **Architectural Decision** - Chose between multiple valid technical approaches
3. **Problem Resolution** - Solved a complex bug or unexpected issue
4. **Feedback Incorporation** - User feedback changed our approach significantly
5. **Learning Moment** - Discovered something unexpected about the codebase

**Skip reflection if ALL of these are true:**
- Work was routine (simple edits, documentation only)
- No significant decisions were made
- No unexpected learnings occurred
- Task was straightforward with obvious approach

### Reflection Generation

If reflection is warranted:

1. Create file: `.yoyo-dev/reflections/YYYY-MM-DD-[brief-title].md`
2. Follow template in `.yoyo-dev/reflections/TEMPLATE.md`
3. Keep concise: 150-300 words target
4. Use ownership language: "I chose...", "I learned..."
5. Include uncertainty if applicable: "I'm not confident about..."

### Reflection Quality Check

Before saving, verify:
- [ ] Context is 1-2 sentences max
- [ ] Decision includes clear reasoning
- [ ] Alternatives are briefly stated
- [ ] Learning is actionable for future sessions
- [ ] Total length under 300 words
