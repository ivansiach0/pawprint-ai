# Pawprint

Pawprint lets users discover fictional pets and keep a private collection of saved pets.

## Language

**Matches**:
A user's private collection of saved pets.
_Avoid_: Mutual matches, adoption requests

**Round**:
A pass through the pets available to a user, ending when each has been passed on or saved. A new round restores passed pets while saved pets remain excluded.

**Remove from Matches**:
Changing a saved pet into a passed pet for that user. The pet becomes eligible for Discover again when the user starts the next round.
_Avoid_: Delete pet, permanent dismissal

**Password recovery**:
Regaining access to an existing account by following a password reset link sent to its registered email address and choosing a new password. Matches and Discover progress remain unchanged.
_Avoid_: Account creation, password retrieval

**Password reset link**:
A single-use link that allows the recipient to choose a new password within 30 minutes of issuance. Only the most recently issued link remains valid, and a successful reset invalidates all previously issued links.
_Avoid_: Temporary password, sign-in link
