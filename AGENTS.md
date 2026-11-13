# Pawprint Agent Instructions

- Read [SPEC.md](SPEC.md) before changing product behavior or architecture.
- Read [TASK.md](TASK.md) before implementing a ticket. Confirm its scope, dependencies, and verification steps.
- Use the README for local setup and verification commands once documented.
- Write project files and user-facing copy in English.

## Ticket workflow

1. Implement only the ticket the owner has authorized. Use the testing boundaries in the specification.
2. Run the ticket checks and share the diff, results, and demo steps.
3. Leave the ticket unchecked while the owner reviews the demo.
4. After the owner approves the demo and authorizes the commit and push, check off the ticket, commit the approved changes, and push to the working branch.
5. Start the next ticket after the push succeeds and the owner authorizes it. Deploy to production after explicit release approval.
