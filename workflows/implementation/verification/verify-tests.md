# Verify Tests

**Purpose:** Verify all tests pass and coverage meets minimum thresholds.

## Verification Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass (if applicable)
- [ ] Test coverage ≥ 50% minimum threshold
- [ ] Critical paths have 100% coverage
- [ ] No skipped/pending tests (unless documented)
- [ ] Tests are meaningful (not just coverage padding)
- [ ] Test names clearly describe what they test
- [ ] Mock data is realistic

## Expected Outcome

100% test pass rate with adequate coverage (minimum 50%).

## Error Handling

**If tests fail:**
1. Document which tests failed with error messages
2. Identify root cause (code bug vs test bug)
3. Add to issues list in verification report
4. Block completion until all tests pass
