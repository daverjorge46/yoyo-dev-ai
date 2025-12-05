# Reflection Log Entry Template

Use this template when generating reflection entries. Reflections capture significant decisions and learnings for session continuity.

## When to Generate Reflections

**Auto-generate at these trigger points:**

1. **Major Feature Completion** - After implementing a significant feature
2. **Architectural Decision** - When choosing between multiple valid approaches
3. **Problem Resolution** - After solving a complex bug or unexpected issue
4. **Feedback Incorporation** - When user feedback changes our approach
5. **Learning Moment** - When discovering something unexpected about the codebase

**Do NOT generate reflections for:**
- Routine task completion
- Minor edits or fixes
- Documentation updates only
- Simple refactors

## Entry Format

```markdown
# Reflection: [BRIEF_TITLE]

**Date:** YYYY-MM-DD
**Spec:** [SPEC_NAME] (if applicable)
**Task:** [TASK_ID] (if applicable)

## Context

[1-2 sentences: What were we working on? What was the situation?]

## Decision

[What I decided and why. Use ownership language: "I chose X because..."]

## Alternatives Considered

- **Alternative A**: [Brief description] - Why not chosen
- **Alternative B**: [Brief description] - Why not chosen

## Uncertainty

[If applicable: What I'm not confident about. "I'm uncertain about X because..."]

## Learning

[What I learned that could apply to future work. Keep concise - 1-3 bullet points.]

## For Next Session

[If applicable: Specific context the next session should know. "Continue with..." or "Verify that..."]
```

## Example Entry

```markdown
# Reflection: Chose React Query over SWR for Data Fetching

**Date:** 2025-12-05
**Spec:** User Dashboard
**Task:** 2.3

## Context

Implementing the user dashboard data fetching layer. The existing codebase had no established pattern for API data fetching.

## Decision

I chose React Query over SWR because:
1. The project already uses TanStack Router, so TanStack Query integrates better
2. React Query's devtools are more mature
3. The mutation API fits our form-heavy workflows

## Alternatives Considered

- **SWR**: Smaller bundle size, simpler API - Not chosen because we need mutation support
- **Custom hooks**: Maximum flexibility - Not chosen because we'd reinvent existing solutions

## Uncertainty

I'm not confident about the cache invalidation strategy for real-time updates. The current approach (invalidate on mutation) may need adjustment if we add WebSocket support.

## Learning

- Checked existing dependencies first - saved time by staying in TanStack ecosystem
- The tradeoff of bundle size vs. features was worth it for mutation support

## For Next Session

If adding real-time features, revisit cache strategy. Current pattern is in `src/lib/queries/`.
```

## File Naming Convention

`YYYY-MM-DD-[brief-title].md`

Examples:
- `2025-12-05-react-query-decision.md`
- `2025-12-05-auth-architecture.md`
- `2025-12-05-performance-fix-learning.md`

## Conciseness Guidelines

- **Context**: 1-2 sentences max
- **Decision**: 3-5 bullet points max
- **Alternatives**: 2-3 alternatives max
- **Uncertainty**: 1-2 sentences if applicable
- **Learning**: 1-3 bullet points
- **Next Session**: 1-2 sentences if applicable

**Total length target: 150-300 words**

Reflections should add value, not create noise. If you can't articulate a clear decision or learning, skip the reflection.
