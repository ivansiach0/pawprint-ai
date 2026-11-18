# 02: Recover from password recovery failures

**Project ticket:** 11

**Specification:** [Password Recovery](../../../docs/features/password-recovery.md)

**What to build:** Let a local user understand pending recovery actions and recover from network failures, an unavailable Mailpit inbox, and an uncertain password-change result. Complete the behavior across UI, BFF, Express, and local delivery, and exercise competing requests and partial failures without weakening ticket 10's integrity guarantees.

**Blocked by:** [01: Complete local password recovery](01-complete-local-password-recovery.md) — project ticket 10. Requires its working reset flow and owner approval under the project workflow.

**Status:** ready-for-agent (blocked by ticket 10)

- [ ] Requesting a link shows **Sending…** and disables duplicate submissions until the request finishes.
- [ ] A browser connection failure while requesting a link retains the email and offers **Try again**. Acknowledged requests retain the same generic response regardless of account existence.
- [ ] Check Mailpit availability before processing a link request, independently of account existence. When unavailable, show **Password recovery is temporarily unavailable. Try again.** for registered and unregistered addresses, retain the email, and offer **Try again**.
- [ ] Restore Mailpit and verify the same request can be retried successfully. Log delivery failures for developer diagnosis without exposing passwords or reset links or creating account-specific browser responses.
- [ ] Submitting a new password shows **Resetting password…** and blocks duplicate submissions.
- [ ] When a password-change result is uncertain, do not automatically repeat it or claim success. Show **We couldn't confirm the reset. Try signing in with your new password, or request a new link.** with **Sign in** and **Request a new link** actions.
- [ ] Simulate a failure before password persistence and a successful reset whose response is lost. Verify the correct recovery path through observable sign-in, link behavior, and protected requests.
- [ ] Verify competing link requests obey serialized issuance order and only the latest link works. A stale form must not overwrite a reset authorized by a newer link.
- [ ] Verify competing submissions cannot reuse a single token. Exercise reset failures and confirm that password, token, and session state cannot be partially applied.
- [ ] Verify session revocation, data preservation, other-account isolation, expiry, invalid-link recovery, and disabled production endpoints remain correct during failure and concurrency scenarios.
- [ ] Browser/BFF and Mailpit tests cover pending states, retry controls, local service outages, uncertain outcomes, and keyboard/focus behavior in desktop and mobile profiles. Express tests cover transactional and concurrent behavior through public interfaces.
- [ ] Run the complete regression suite, ESLint, TypeScript checks, and the production build. Document local demo steps for the outage and uncertain-outcome cases.
- [ ] Keep real sending, production activation, external provider setup, and client-IP rate limiting outside this ticket.

Leave this ticket unchecked until owner review. Commit, push, and release follow the project approval workflow.
