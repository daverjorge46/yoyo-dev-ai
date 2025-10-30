# Verify Security

**Purpose:** Verify no security vulnerabilities exist in implementation.

## Verification Checklist

- [ ] Authentication validates on server-side
- [ ] Authorization checks for all protected resources
- [ ] Input validation on all user inputs
- [ ] SQL/NoSQL injection protection
- [ ] XSS prevention measures in place
- [ ] CSRF protection enabled
- [ ] Sensitive data encrypted
- [ ] No secrets in code or logs
- [ ] Dependencies have no known CVEs
- [ ] API rate limiting implemented (if applicable)

## Expected Outcome

Zero security vulnerabilities with defense in depth.

## Error Handling

**If security issues found:**
1. Document vulnerability with severity level
2. Provide specific remediation steps
3. Add to issues list in verification report
4. **BLOCK COMPLETION** - security issues must be fixed before merge
5. Consider security review mode for critical issues
