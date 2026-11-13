# Pawprint MVP Tasks

Use [SPEC.md](SPEC.md) as the source of truth and follow the ticket workflow in [AGENTS.md](AGENTS.md).

- [ ] **01 — Project setup and landing**  
  Depends on none. Set up Next.js App Router, TypeScript, vanilla-extract, Radix UI Primitives, and ESLint. Build the public landing page with a brief introduction to Pawprint.  
  Verify with a browser smoke test that a signed-out visitor can see the introduction. Check legibility at desktop and mobile widths. Run lint, type checks, and the production build.

- [ ] **02 — Sign up and sign in through the BFF**  
  Depends on 01. Apply the authentication migrations to an empty development PostgreSQL database. Host Better Auth in Express and relay authentication requests and cookies through Next.js.  
  Verify that email and password registration opens a protected Discover placeholder immediately, the session survives reload, and an existing user can sign in from a fresh browser session. Verify that Express rejects a protected request without a session.

- [ ] **03 — Seed the catalog and show the first pet**  
  Depends on 02. Add the pet table, a reproducible seed for the 67 profiles, and a protected catalog endpoint. Show the first pet in Discover with an edge-to-edge photo.  
  Verify that running the seed twice leaves exactly 67 profiles and that Discover shows the same first pet after reload.

- [ ] **04 — Pass, save, and view Matches**  
  Depends on 03. Add Pass and Save buttons, persist decisions per account, and show the private Matches gallery and its empty state.  
  Verify that decisions survive reload and that a second account sees only its own progress and saved pets.

- [ ] **05 — Finish a round and explore again**  
  Depends on 04. Offer Explore again when a round ends and passed pets remain. Offer View Matches when every pet is saved.  
  Verify that a new round restores only passed pets in their original order and that View Matches opens the saved gallery.

- [ ] **06 — Retry a swipe after a connection failure**  
  Depends on 04. Keep the card visible and offer Try again when the result is uncertain.  
  Verify retries both before persistence and after a lost response. Discover advances once and Matches contains a single entry for the saved pet.

- [ ] **07 — Swipe with mouse, touch, and keyboard**  
  Depends on 06. Connect mouse drag, touch gestures, and arrow keys to the same behavior as Pass and Save.  
  Verify both directions across inputs and confirm a failed gesture can be retried.

- [ ] **08 — Review and deploy the MVP**  
  Depends on 05 and 07. Review the diff against SPEC.md and project standards. Document the build, migration, seed, and start commands. After release approval, deploy from GitHub to Render with public Next.js, private Express, and Render PostgreSQL.  
  Verify registration, sign-in, Pass, Save, and Matches at the production URL, and confirm Express is reachable only privately.
