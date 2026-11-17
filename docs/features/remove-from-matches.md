# Remove from Matches

Status: Project ticket 09 implemented and approved by the owner. Automated verification and code review passed. Production release is pending.

## Problem Statement

Users cannot remove pets from their private Matches gallery after saving them. They need to change their mind without deleting a pet from the shared catalog, affecting another user, or losing the ability to discover that pet again later.

## Solution

Each saved pet offers **Remove from Matches**. A confirmation dialog provides **Cancel** and **Remove**. Confirming changes that user's saved pet into a passed pet: it disappears from Matches after server confirmation and becomes eligible for Discover when the user starts the next round with **Explore again**.

The interface preserves the card while removal is pending or uncertain. Retrying safely confirms an earlier successful removal, while an outdated action cannot remove a later save of the same pet.

## User Stories

1. As a signed-in user, I want a removal action on each saved pet so that I can change my selections.
2. As a user, I want the confirmation to identify the pet so that I know which selection I am changing.
3. As a user, I want to cancel the confirmation so that an accidental action leaves my Matches unchanged.
4. As a user, I want **Removing…** feedback and duplicate submissions disabled for that pet so that I understand the request is pending.
5. As a user, I want the card to disappear only after confirmation from the server so that an unconfirmed removal does not appear successful.
6. As a user, I want an error and **Try again** when removal fails or its outcome is uncertain so that I can recover without losing the card.
7. As a user, I want retrying a successful removal to confirm the same result so that a lost response does not cause another change.
8. As a user, I want removal to persist after reload and when I return on another device so that Matches reflects my choices.
9. As a user, I want a removed pet excluded from my current Discover round so that it does not immediately reappear.
10. As a user, I want removed pets restored in the next round's existing catalog order so that **Explore again** remains predictable.
11. As a user, I want to save a removed pet again in a later round so that I can reconsider it.
12. As a user, I want a stale removal action to preserve a later save so that an old tab or delayed retry cannot undo my newer choice.
13. As a user, I want **No matches yet** and **Go to Discover** when I remove my last saved pet so that I have a clear next step.
14. As a user, I want my removals to affect only my Matches so that other users retain their own choices.
15. As a keyboard or mobile user, I want accessible removal and confirmation controls so that I can complete the same flow without a mouse.

## Implementation Decisions

- Preserve the Next.js BFF and Express ownership boundaries. Browser mutations go through the BFF; Express validates the session and derives the user identity from it.
- Extend the Matches response with sufficient identity information for the specific save shown on each card. A removal targets that save, rather than any future save for the same pet.
- Preserve sufficient save identity across removals and round resets to distinguish an already-completed removal from a later save. The current pet identifier and choice alone do not meet this requirement. The implementation keeps one durable last-save record per user and pet, with an opaque save version and a removed marker. A new save replaces that version; round resets do not delete the record. The migration backfills identities for existing saved pets.
- Apply the removal and its stale-action check atomically, using the same account lock as round transitions and swipe decisions. Coordinate removal with existing round transitions and swipe decisions so that concurrent requests cannot overwrite a newer save or restore a removed pet into the round in which removal took effect.
- A successful removal changes the authenticated user's saved pet into a passed pet. It never deletes the shared pet profile or changes another user's decisions.
- A removed pet remains excluded from the active round in which removal takes effect. The existing **Explore again** action restores it with other passed pets after the round is complete. If all pets were saved, removal makes **Explore again** available under the existing end-of-round rules.
- Repeating a removal for a save that is already removed succeeds without additional effects, including after a round transition, provided no newer save has occurred.
- If a later save exists, an action targeting an older save returns a conflict without changing the newer save. The UI explains that Matches changed and offers **Refresh Matches**, rather than silently retrying against the newer save.
- Reject unauthenticated and malformed requests using the existing API conventions. The BFF retains its mutation origin checks and forwards session cookies; the public Express API independently enforces authentication.
- Use the existing visual system and Radix UI dialog primitives for an accessible confirmation dialog. Identify the pet in the dialog and provide **Cancel** and **Remove**, keyboard operation, accessible labeling, and appropriate focus management.
- Keep the card visible and show **Removing…** while confirmation is pending. Prevent duplicate submissions for that pet. Do not remove the card optimistically.
- On a network or server failure, retain the card with an error and **Try again** targeting the original save. Treat stale-save conflicts separately from transient errors.
- After confirmed removal, refresh the relevant Matches and Discover views. Reuse the existing empty gallery when no saved pets remain and keep unchanged pets visible.
- Keep all project documentation and user-facing copy in English.

## Testing Decisions

Use the project's existing boundaries: the browser flow through the Next.js BFF and the authenticated Express API with a disposable test database. Verify externally observable behavior, not internal functions, component structure, SQL statements, or implementation-specific database fields.

Existing Matches, round-transition, account-isolation, and lost-response browser tests provide the prior art. Use desktop and mobile browser profiles and the existing screenshot-on-failure configuration.

### Browser and BFF acceptance checks

- Open confirmation for a named pet, cancel, and verify the pet remains saved after reload.
- Confirm removal, observe the pending state with the card retained, and verify it disappears only after a successful response.
- Reload after removal and verify persistence. Remove the last saved pet and verify the existing empty state and Discover link.
- Exercise keyboard confirmation and cancellation, with appropriate focus behavior.
- Simulate failure before persistence: retain the card and retry successfully.
- Simulate persistence followed by a lost response: retain the card and retry to confirm removal without additional effects.
- Verify another saved pet remains present and another account's Matches is unchanged.
- Verify the removed pet stays excluded from the current round, returns in catalog order after **Explore again**, and can be saved again.
- After a later save, submit an old removal or retry from another tab: preserve the new save, show the conflict message, and let **Refresh Matches** load the current gallery.

### Express acceptance checks

- Reject removal without a session and invalid removal inputs.
- Apply a removal only to the authenticated user's saved pet and preserve the shared catalog and other users' selections.
- Confirm duplicate removals without additional effects, including a retry after a round reset when the pet has not been saved again.
- Reject removal targeting an older save after the pet has been saved again.
- Exercise removal alongside round transitions and decisions to verify the accepted ordering through public API responses and subsequent Discover and Matches reads.
- Verify existing saved pets remain removable after any required migration and run existing regression tests for swiping, rounds, retries, and authentication.

## Out of Scope

- An **Undo** action or immediate restoration to the current Discover round.
- Permanent dismissal, shared catalog deletion, bulk removal, or removing another user's selections.
- Google sign-in, password recovery, and authentication rate limiting by client IP.
- Live synchronization of open tabs through polling, WebSockets, or push notifications. A stale view is handled when an action is submitted or the user refreshes.
- Pet detail pages, adoption applications, and unrelated UI redesigns.

## Further Notes

The owner approved the design after the interview. This document proposes no application code changes, commits, pushes, or deployments. After specification approval, use `/to-tickets` to propose complete, demoable slices with their tests. Implement only an approved ticket and preserve the existing owner review, commit, push, and release workflow.
