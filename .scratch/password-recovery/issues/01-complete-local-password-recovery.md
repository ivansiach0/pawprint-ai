# 01: Complete local password recovery

**Project ticket:** 10

**Specification:** [Password Recovery](../../../docs/features/password-recovery.md)

**What to build:** Let a local user request a password reset email, open it in Mailpit, choose and confirm a new password, and return to Sign in. Deliver the complete UI, BFF, Express, persistence, and local email flow. Preserve existing account data and keep recovery disabled in production from the first implementation.

**Blocked by:** None (can start immediately; uses existing authentication).

**Status:** complete (owner-approved for commit and push; local-only)

- [x] Local Sign in offers **Forgot password?**, leading to a labeled email form.
- [x] A reset-link request shows the approved generic acknowledgment for both registered and unregistered email addresses. Only registered accounts receive a recovery message.
- [x] Mailpit runs locally in Docker with its inbox at `http://localhost:8025`, loopback-only port exposure, and forwarding and relaying disabled. Document startup and inbox inspection.
- [x] Captured English Pawprint emails contain a link to the configured browser-facing local origin. Browser recovery traffic uses the BFF, and arbitrary reset redirect destinations are rejected.
- [x] A reset link expires after 30 minutes and works only once. Opening or previewing the form does not consume it.
- [x] Only the latest issued link is valid. Earlier links and forms opened before a newer issuance cannot authorize a password change.
- [x] Invalid, expired, superseded, and used links show **This reset link is invalid or has expired** and offer a new request.
- [x] The form provides **New password** and **Confirm new password**, enforces the existing password policy including an eight-character minimum, and reports mismatches before submission. Correctable validation errors do not consume the link.
- [x] A successful reset invalidates all previous links, revokes all previous sessions, and directs the user to Sign in without creating a new session. The new password works and the old password fails.
- [x] Matches and Discover progress are preserved, and other accounts remain unaffected. Any persistence changes preserve existing authentication data.
- [x] Implement durable latest-link enforcement and coordinated state changes with transactional password update, token consumption, and session revocation. Do not defer the integrity guarantees to ticket 11.
- [x] The BFF checks mutation origins and Express independently validates requests. Do not log passwords or reset links.
- [x] In production, hide the recovery entry point and disable BFF and direct Express recovery operations, even with local mail configuration present. Existing authentication remains functional.
- [x] Browser/BFF, Express, and Mailpit acceptance tests cover the complete local flow, validation, expiry using controlled time, latest-link and single-use rules, session revocation, data preservation, and production-disable behavior.
- [x] Forms work on desktop and mobile and support keyboard operation, accessible labels, appropriate focus, and understandable feedback.
- [x] ESLint, TypeScript, the production build, and relevant regressions pass. Document a complete local demo for owner approval.

Ticket 11 delivers the explicit pending, retry, unavailable-inbox, and uncertain-outcome experience and adversarial failure/concurrency verification. This ticket must already enforce link and reset integrity.

The owner approved the local demo and authorized commit and push. Real email delivery and production recovery activation are outside both local tickets.

## Verification completed

- The complete development-mode Playwright suite passed: 52 desktop and mobile checks, including 16 password-recovery checks.
- Two additional checks passed against the local production build with local settings present: recovery remained unavailable in UI, BFF, and Express, and normal authentication worked.
- ESLint, TypeScript checks, the production build, and the Mailpit Compose configuration passed.
- Standards review found no issues. Specification review found a same-tab newest-link issue; a failing browser test reproduced it, the fix passed in both profiles, and re-review cleared it.
- Tests used disposable local PostgreSQL and Mailpit instances. No real email was sent and the Render database was not modified.
- The README documents local opt-in, migration, inbox startup, and the owner demo. The owner confirmed receiving the reset email in Mailpit and successfully changing the password. The owner authorized commit and push after approving the demo.
- Ticket 11 has not started; its advanced failure, retry, and adversarial verification scope remains deferred.
