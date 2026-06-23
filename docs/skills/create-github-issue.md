# Create GitHub issue

Use this guide to create clear, lightweight development issues for this project.
Issues should describe the work, why it matters, what is in scope, and how to know when it is done.

Do not add milestones, priority labels, or area labels.

## Issue format

```markdown
# Title

## Summary

Short explanation of the work.

## Why

Why this matters.

## Scope

- Specific task 1
- Specific task 2
- Specific task 3

## Acceptance Criteria

- [ ] Clear measurable requirement
- [ ] Clear measurable requirement
- [ ] Clear measurable requirement

## Notes

Any constraints, links, or implementation details.
```

## Label guidance

Use one primary label:

- `bug` for broken behavior
- `feature` for new functionality
- `documentation` for docs
- `question` for research or decisions
- `security` for auth, privacy, compliance, or security work
- `tech-debt` for cleanup, refactor, or maintenance
- `wontfix` only when closing something intentionally

Do not add milestones.
Do not add priority labels.
Do not add area labels.

## Examples

### Feature issue

Label: `feature`

```markdown
# Add case dashboard empty state

## Summary

Add an empty state to the case dashboard for accounts that do not have a case yet.

## Why

New users need a clear next step after signing in so they can start their K-1 visa workflow without confusion.

## Scope

- Show an empty state when the signed-in account has no case records.
- Include a primary action to start a new case.
- Keep the dashboard layout consistent with the existing app theme.

## Acceptance Criteria

- [ ] A signed-in user with no cases sees an empty state instead of a blank dashboard.
- [ ] The empty state includes a visible action to start a case.
- [ ] A signed-in user with an existing case still sees their case content.

## Notes

Do not change authentication behavior or add onboarding flows outside the dashboard.
```

### Bug issue

Label: `bug`

```markdown
# Fix password reset link expiration message

## Summary

Show a clear error when a user opens an expired password reset link.

## Why

Expired reset links currently create confusion because users cannot tell whether the link is invalid, expired, or already used.

## Scope

- Detect expired password reset tokens during reset link validation.
- Show a user-facing message that explains the link expired.
- Provide a path to request a new reset link.

## Acceptance Criteria

- [ ] Opening an expired reset link shows an expiration-specific error.
- [ ] The error page includes a way to request a new reset link.
- [ ] Valid reset links continue to allow password reset.

## Notes

Preserve token security. Do not reveal whether an email address belongs to an account.
```

### Security issue

Label: `security`

```markdown
# Add rate limiting to login attempts

## Summary

Add rate limiting to repeated login attempts for the same account or client source.

## Why

Login rate limiting reduces credential stuffing and brute-force risk while keeping normal sign-in behavior usable.

## Scope

- Limit repeated failed login attempts.
- Return a safe user-facing response when the limit is reached.
- Log rate-limit events with enough context for investigation.

## Acceptance Criteria

- [ ] Repeated failed login attempts are throttled after the configured limit.
- [ ] Rate-limited responses do not reveal whether an email address exists.
- [ ] Successful login behavior remains unchanged for normal usage.

## Notes

Avoid logging passwords, reset tokens, session tokens, or other secrets.
```
