# Verify Performance

**Purpose:** Verify no performance regressions and budgets are met.

## Verification Checklist

- [ ] Page load time < 3 seconds
- [ ] Time to Interactive (TTI) < 5 seconds
- [ ] No memory leaks detected
- [ ] No unnecessary re-renders
- [ ] API response times acceptable
- [ ] Database queries optimized (no N+1)
- [ ] Bundle size within budget
- [ ] Images optimized
- [ ] Lazy loading implemented where appropriate
- [ ] No blocking operations on main thread

## Expected Outcome

Performance metrics meet or exceed baseline with no regressions.

## Error Handling

**If performance issues found:**
1. Document specific metrics that failed
2. Identify bottlenecks (rendering, network, computation)
3. Provide optimization recommendations
4. Add to issues list in verification report
5. Block completion for critical performance regressions (>20% slower)
