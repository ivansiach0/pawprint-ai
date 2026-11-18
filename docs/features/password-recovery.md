# Password Recovery

Status: Ticket 10 implemented; automated verification and code review passed. The owner approved the local demo after receiving the Mailpit link and changing their password. Commit and push are authorized. Recovery remains local-only, and ticket 11 has not started.

## Problem Statement

A user who forgets their password cannot regain access to Pawprint. They need to choose a new password while retaining their existing account, Matches, and Discover progress.

This phase must be demonstrable entirely on a developer's computer. The deployed application has no real email delivery service, so password recovery must remain unavailable in production until a later feature integrates one.

## Solution

In local development, **Forgot password?** on Sign in opens an email form. A registered user receives a password reset link in the local Mailpit inbox. The request acknowledgment is identical for registered and unregistered email addresses.

The latest issued link allows the user to choose and confirm a new password within 30 minutes. It is single-use. A successful reset invalidates all previous reset links, closes all previous sessions, and directs the user to Sign in with their new password. It does not sign them in automatically or alter their pet selections.

The UI explains invalid links, service failures, and uncertain outcomes. Real delivery, sender-domain setup, and production activation belong to a later phase.

## User Stories

1. As a local user, I want **Forgot password?** on Sign in so that I can begin recovery when I cannot remember my password.
2. As a user, I want to request a link with my account email so that I can recover my existing account.
3. As a user, I want the same acknowledgment for any email so that recovery does not reveal whether an account exists.
4. As a developer, I want recovery emails captured in Mailpit so that I can inspect and open them without sending real messages.
5. As a user, I want a clearly identified Pawprint email with a reset action so that I can reach the new-password form.
6. As a user, I want a reset link to expire after 30 minutes so that old links cannot be used indefinitely.
7. As a user, I want only my most recently issued link to work so that requesting another link replaces earlier recovery attempts.
8. As a user, I want each link to work once so that it cannot be reused after a successful reset.
9. As a user, I want invalid, expired, and used links to explain what happened and offer another request so that I can continue recovery.
10. As a user, I want to enter **New password** and **Confirm new password** so that I can check my intended password before saving it.
11. As a user, I want a mismatch error before submission so that I can correct the confirmation without sending an invalid request.
12. As a user, I want the existing password policy, including an eight-character minimum, so that recovery is consistent with registration.
13. As a user, I want **Sending…** and duplicate submissions disabled while requesting a link so that I understand the request is pending.
14. As a user, I want my email retained and **Try again** after a connection failure so that I can request recovery again.
15. As a user, I want **Resetting password…** and duplicate submissions disabled while changing my password so that I understand the change is pending.
16. As a user, I want guidance when a reset response is lost so that I can try signing in with my new password or request another link without an automatic repeated change.
17. As a user, I want all previous sessions closed after a successful reset so that access requires my new password.
18. As a user, I want to return to Sign in after resetting so that I can explicitly sign in with my new password.
19. As a user, I want my Matches and Discover progress preserved so that recovery does not restart my Pawprint experience.
20. As a user, I want a service-unavailable message and a retry action when the local inbox is down so that I can recover after it starts again.
21. As a developer, I want useful delivery diagnostics without passwords or reset links in logs so that I can investigate failures without exposing recovery credentials.
22. As a production user, I want registration and sign-in to continue working while this unfinished delivery feature remains disabled.
23. As a keyboard or mobile user, I want labeled, accessible recovery forms and status messages so that I can complete the same flow.

## Implementation Decisions

### Architecture and local scope

- Preserve Next.js as the UI and BFF, Express as the authentication owner, Better Auth for password and session handling, and PostgreSQL for durable authentication state.
- Expose local recovery forms and forward browser mutations through the BFF. Preserve mutation origin checks and validate reset data in Express independently of the UI.
- Generated email links and allowed redirects must use the configured browser-facing local origin. Keep the user-facing flow on the BFF; never require the browser to call Express directly or accept an arbitrary redirect destination.
- Use Mailpit in Docker as the local email capture service. Its web inbox is available at `http://localhost:8025`; expose development mail ports on loopback and leave forwarding and relaying disabled.
- Keep credentials, reset tokens, and delivery details out of client configuration and application logs. Opening or previewing the reset form must not consume a link; only a successful password change consumes it.
- Disable recovery in production at both the BFF and Express boundaries, including direct calls to underlying Better Auth recovery operations. Hide **Forgot password?** and prevent a usable reset flow even if local mail settings are accidentally present. Registration, sign-in, sign-out, Discover, and Matches retain their existing behavior.
- Document local startup, Mailpit inspection, test configuration, and the deferred production-delivery work. Do not configure a production email provider or change Render resources in this feature.

### Requesting a link

- Validate the email input. With the local mail service available, use the same acknowledgment and response shape for registered and unregistered email addresses: **If an account exists for this email, you'll receive a password reset link.** Only registered accounts receive a message.
- Show **Sending…** and disable duplicate submissions while the request is pending. Retain the email and offer **Try again** after a browser connection failure.
- Check local email service availability before processing a reset-link request, independently of account existence. If unavailable, return the same service failure for any email and show **Password recovery is temporarily unavailable. Try again.** Retain the email and provide **Try again**.
- Log local delivery failures without passwords or reset links. An acknowledgment is not a claim that a message has reached a real inbox. Delivery diagnostics must not create account-specific disclosures in browser responses.

### Link lifecycle and password change

- Reset links are single-use and expire 30 minutes after issuance. Only the latest issued link for an account remains valid; a later request invalidates earlier links. Define the ordering through serialized issuance, rather than relying on the order messages appear in Mailpit.
- Coordinate issuance, token checks, consumption, password updates, and session revocation so that simultaneous requests cannot use an obsolete link, reuse a consumed link, or leave a partially applied reset. Recheck validity when the new password is submitted, even if the form was opened earlier.
- The installed Better Auth behavior needs explicit integration: it defaults to a longer token lifetime, allows independent outstanding tokens, and does not revoke sessions by default. Configure the approved lifetime and revocation behavior, and add durable latest-link enforcement. Ensure adapter transactions are enabled where required; do not assume these guarantees are already provided by the current configuration.
- Retain existing authentication and pet data when introducing any necessary persistence changes. Ticket 10 uses one durable reset record per account with a random-token digest and expiration. Issuance and reset share an account lock; credential updates, token consumption, and session deletion occur in one transaction. Better Auth supplies the password hasher, and its native reset routes are blocked to prevent bypassing the latest-link policy. No new account is created during recovery.
- Provide **New password** and **Confirm new password** with appropriate password autocomplete. Require matching values and the existing server password policy, including the eight-character minimum. Keep any existing backend maximum consistent with registration.
- While submission is pending, show **Resetting password…** and block duplicate submissions. Validation errors leave the form available for correction and do not consume a valid link.
- On successful reset, invalidate all previous reset links and revoke all previous sessions. Direct the user to Sign in, require the new password, reject the old password, and preserve Matches and Discover progress. Do not create a new session automatically.
- For invalid, expired, superseded, or used links, show **This reset link is invalid or has expired** and an action to request a new link.
- If the browser loses the reset response, do not automatically repeat the change or claim success. Show **We couldn't confirm the reset. Try signing in with your new password, or request a new link.** Offer **Sign in** and **Request a new link**. The same guidance applies whether the request failed before persistence or the successful response was lost.
- Keep project documentation, email content, forms, status messages, and errors in English. Reuse the existing visual system and accessible form conventions.

## Testing Decisions

The owner confirmed three boundaries: the browser flow through Next.js/BFF, the Express authentication API with a disposable database, and the local Mailpit delivery boundary. Prefer end-to-end observations across these boundaries; do not test private helpers, password hash values, database layout, or internal function calls.

Use the existing Playwright authentication and lost-response tests as prior art. Inspect captured mail through Mailpit's supported interface, open its link as a user would, and verify account access through sign-in and protected requests. Use isolated accounts, local databases, and a local inbox with no external relay. Do not send real email or mutate the Render database.

### Browser and BFF acceptance checks

- Find **Forgot password?** on local Sign in; request a link and see the approved generic acknowledgment for both an existing and an unknown email.
- Observe **Sending…**, blocked duplicate submissions, retained email, and **Try again** after a connection failure.
- Open the captured email link, enter matching new passwords, observe **Resetting password…**, and return to Sign in after success.
- Reject short or mismatched passwords without consuming the valid link; correct the input and complete the reset.
- Verify invalid, expired, already-used, and superseded links show the approved message and offer a new request. Also submit a form opened before a newer link was issued to verify validity is checked again.
- Simulate failure before password persistence and a lost response after persistence. Show uncertain-outcome guidance, avoid automatic resubmission, and verify the appropriate sign-in or new-link recovery path.
- Sign in with the new password, reject the old one, and verify previous sessions no longer open protected pages. Verify Matches and Discover progress remain intact.
- Verify desktop and mobile form usability, keyboard operation, labels, focus, status feedback, and the existing screenshot-on-failure behavior.
- With Mailpit unavailable, verify the same service error and retry behavior for existing and unknown accounts. Restore it and successfully retry.

### Express acceptance checks

- Verify account-neutral acknowledgments, no recovery action for an unknown account, allowed redirect handling, and independent request validation.
- Verify 30-minute expiry, single-use consumption, latest-link enforcement, and rejection of previously opened or used links. Use controlled time rather than real 30-minute waits.
- Verify competing link requests and competing reset submissions respect the approved ordering and cannot both reuse one token or apply an obsolete reset.
- Verify a failed reset does not leave the password, session state, and token state partially changed.
- Verify all prior sessions are revoked only after a successful reset, subsequent sign-in requires the new password, no automatic session is created, and other accounts remain unaffected.
- Exercise missing or invalid local mail configuration and service unavailability without revealing account existence or logging reset credentials.

### Mailpit and production-disable acceptance checks

- Verify a registered account receives an English Pawprint reset email with the expected local browser-facing link, while an unknown address receives no recovery message.
- Follow the latest message's link and verify that earlier messages cannot authorize a reset. Confirm merely opening the form does not consume the link.
- In production-mode verification, confirm the recovery entry point is hidden and both BFF and direct Express recovery operations are disabled, even when local mail configuration is present. Verify normal authentication still works.
- Run the existing regression suite, ESLint, TypeScript checks, and the production build after implementation.

## Out of Scope

- Real email delivery, paid email services, provider selection, API keys for external sending, sender-domain verification, and production activation.
- Email verification during registration, Google sign-in, changing the account email, or changing a known password from account settings.
- Authentication rate limiting by client IP, which remains a separate feature.
- Resetting pet selections, deleting accounts, unrelated UI changes, and automatic sign-in after recovery.
- Automatic retries of a password change after an uncertain response.

## Further Notes

This is a local-only feature. Render's current authentication experience remains available without recovery until a separately approved delivery integration is ready.

The owner approved two complete slices: ticket 10 delivers the working local recovery flow and production-disable rules; ticket 11 adds the failure-recovery experience and adversarial verification. Ticket 11 is blocked by ticket 10. Ticket 10 is implemented and owner-approved after 52 development checks and two local production-disable checks passed. The owner confirmed successful password recovery using Mailpit. Ticket 11 has not started. Follow the existing local ticket and owner-review workflow.
