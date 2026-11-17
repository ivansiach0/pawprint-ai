# 01: Remove a pet from Matches safely

**Project ticket:** 09

**Specification:** [Remove from Matches](../../../docs/features/remove-from-matches.md)

**What to build:** Let a signed-in user remove a saved pet through an accessible confirmation dialog. Confirmed removal keeps the pet out of the current Discover round and makes it eligible after **Explore again**. Preserve uncertain requests for safe retry and protect later saves from outdated removal actions. Deliver the complete browser, BFF, Express, persistence, and test flow in this ticket.

**Blocked by:** None (can start immediately; uses the existing MVP).

**Status:** complete (owner-approved; production release pending)

- [x] Each saved pet offers **Remove from Matches** and a confirmation identifying the pet, with **Cancel** and **Remove** actions.
- [x] Canceling leaves Matches unchanged, including after reload. The dialog supports keyboard operation, accessible labels, and appropriate focus management.
- [x] While removal is pending, the card remains visible with **Removing…** and duplicate submissions disabled for that pet. The card disappears only after server confirmation.
- [x] A failed or uncertain request retains the card with an error and **Try again**. Retry targets the original save; a lost successful response does not cause additional changes.
- [x] A confirmed removal persists across reloads, affects only the authenticated user, and preserves the shared pet catalog and other users' decisions.
- [x] Removing the final saved pet shows **No matches yet** and **Go to Discover**.
- [x] The removed pet stays excluded from the round in which removal takes effect, returns in catalog order after **Explore again**, and can be saved again. Removing a pet when all pets are saved makes **Explore again** available.
- [x] A stale removal or retry cannot remove a later save of the same pet. The UI explains the conflict and offers **Refresh Matches**.
- [x] Repeated removal of an already-removed save succeeds without additional effects, including after a round reset if no newer save exists.
- [x] Any required migration preserves existing saved pets and makes them removable. Save identity and atomic state changes protect against concurrent removal, round transitions, and decisions.
- [x] The BFF preserves mutation origin checks and session forwarding. Express independently rejects unauthenticated and malformed requests and derives account identity from the session.
- [x] Browser/BFF tests cover desktop and mobile behavior, confirmation, pending feedback, failures before persistence, lost responses after persistence, empty state, reloads, and stale actions.
- [x] Express API tests verify authentication, account isolation, repeat requests, later-save conflicts, round-reset retries, and concurrent operations through observable API behavior.
- [x] Existing regression tests, ESLint, TypeScript checks, and the production build pass. Document local demo steps for owner review.
- [x] Keep **Undo**, bulk removal, permanent dismissal, live tab synchronization, and unrelated authentication features outside this ticket.

The owner approved the implementation and authorized its commit. Push and deployment follow the project approval workflow.

## Verification completed

- ESLint, TypeScript, and the production build passed.
- The complete Playwright suite passed: 36 desktop and mobile checks, including 20 checks for this feature.
- A separate upgrade exercise created a saved pet with the previous API, applied the new migration, and verified through the updated API that the existing pet remained saved and could be removed.
- Standards review found no issues. Specification review found a keyboard focus issue; it was reproduced with a failing test, fixed, and cleared on re-review.
- All database verification used disposable local PostgreSQL databases. The deployed database was not modified.
- Local demo steps are documented in the README. The owner approved the local demo and acceptance checks.
