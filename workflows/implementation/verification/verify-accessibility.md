# Verify Accessibility

**Purpose:** Verify WCAG AA compliance and accessibility best practices.

## Verification Checklist

- [ ] Color contrast meets WCAG AA (4.5:1 minimum)
- [ ] All interactive elements have focus states
- [ ] Keyboard navigation works for all features
- [ ] ARIA labels present where needed
- [ ] Semantic HTML used appropriately
- [ ] Images have alt text
- [ ] Forms have proper labels
- [ ] Error messages are accessible
- [ ] Screen reader testing completed (if applicable)
- [ ] Touch targets ≥ 44px on mobile

## Expected Outcome

Full WCAG AA compliance with no accessibility violations.

## Error Handling

**If accessibility issues found:**
1. Document violations with specific locations
2. Provide recommended fixes using design tokens
3. Add to issues list in verification report
4. Block completion for critical violations (contrast, keyboard nav)
