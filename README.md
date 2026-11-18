# Pawprint

Pawprint is a pet discovery app. Next.js serves the public site and forwards authentication requests to the Express API. Better Auth stores accounts and sessions in PostgreSQL.

## Local development

Use Node.js 22 and a local PostgreSQL instance. For example, start a disposable development database with Docker:

```sh
docker run --rm -d --name pawprint-dev-db \
  -e POSTGRES_USER=pawprint -e POSTGRES_PASSWORD=pawprint_local \
  -e POSTGRES_DB=pawprint_dev -p 127.0.0.1:55432:5432 postgres:17
```

From the project root, install dependencies and copy the example environment file.

```sh
npm ci
cp -n .env.example .env.local
openssl rand -hex 32
```

Set `BETTER_AUTH_SECRET` in `.env.local` to the generated value. Adjust `DATABASE_URL` if your local PostgreSQL instance uses different settings. Use the same public origin in the browser and in `BETTER_AUTH_URL`.

```sh
npm run db:migrate
npm run db:seed
npm run dev:api
```

In another terminal, run `npm run dev` and open [Pawprint](http://localhost:3000). Create an account and check that Discover shows Luna with her photo, species, and age. Reload to verify the same pet appears. Select **Sign out** and confirm you return to the landing page. Open `/discover` again and confirm you are redirected to **Sign in**.

From a fresh account, select **Pass** on Luna and **Save** on Milo.
Reload Discover and check that Bella is still the next pet.
Open **Matches** and check that only Milo appears, with his photo, species, and age.
Register a second account in a private window to verify that it starts at Luna and shows **No matches yet** in Matches.

The seed adds 67 fixed profiles and can be run again without duplicating pets. Discover loads photos from the supplied catalog.

## Verification

Use a separate disposable database for automated tests. With the Docker container above, create it once with `docker exec pawprint-dev-db createdb -U pawprint pawprint_test`. The test runner applies migrations, seeds pets, and starts the app services on loopback, including a test-only API with controlled time for reset-link expiry. Recovery tests also require a dedicated Mailpit inbox.

```sh
docker run --rm -d --name pawprint-test-mail \
  -p 127.0.0.1:8026:8025 axllent/mailpit:v1.27.4
npx playwright install chromium
TEST_DATABASE_URL=postgresql://pawprint:pawprint_local@127.0.0.1:55432/pawprint_test npm test -- --workers=1
npm run lint
npm run typecheck
npm run build
TEST_DATABASE_URL=postgresql://pawprint:pawprint_local@127.0.0.1:55432/pawprint_test npm test -- --config=playwright.production.config.ts --workers=1
docker stop pawprint-test-mail
```

The browser tests cover the public homepage, registration, session persistence, first pet after reload, sign-in, and sign-out in desktop and mobile Chromium profiles. They also check that Express rejects a direct request to Discover without a session.

The landing photo comes from the supplied [pet catalog](https://pets-images.dev-apis.com/pets/dog1.jpg).

Playwright saves screenshots for failed tests in `test-results/`.

## Remove from Matches: local review

Use a development database and apply the new migration with `npm run db:migrate` before starting Express and Next.js. The migration preserves existing Matches and gives each save an identity; keep the API and BFF on the same release. Do not apply this migration to the deployed database until release approval.

1. Sign in, save Luna and Milo, and open Matches.
2. Select **Remove from Matches** on Luna. Verify the dialog names Luna and initially focuses **Cancel**. Cancel or press Escape: Luna remains and focus returns to the removal button.
3. Open the dialog again and confirm **Remove**. The card stays visible with **Removing…** until confirmation, then disappears. Milo remains. Reload to verify persistence.
4. Remove Milo and verify **No matches yet** and **Go to Discover**. Removed pets stay excluded until the next **Explore again** round, when they return in catalog order and can be saved again.
5. With Matches open in two tabs, remove a pet in one tab, finish the round, start another round, and save it again. Attempt removal in the old tab: the newer save remains, and **Refresh Matches** loads the current gallery.

Run the focused automated tests against a disposable test database for failures before persistence, a lost successful response, stale retries after a round reset, account isolation, and concurrent removal/round transitions:

```sh
TEST_DATABASE_URL=postgresql://pawprint:pawprint_local@127.0.0.1:55432/pawprint_test npm test -- tests/remove-matches.spec.ts --workers=1
```

## Password recovery: local review (ticket 10)

Recovery is opt-in locally and always disabled when `NODE_ENV=production` or Render's `RENDER` environment marker is present. This phase captures messages in Mailpit; it does not send real emails. Pending/retry refinements and the unavailable-inbox experience belong to ticket 11.

Start the local inbox:

```sh
docker compose -f compose.mailpit.yaml up -d
```

Use a development `DATABASE_URL`. Add these settings to `.env.local`, using the same browser-facing origin as your existing `BETTER_AUTH_URL`:

```dotenv
PAWPRINT_LOCAL_RECOVERY=true
MAILPIT_ORIGIN=http://127.0.0.1:8025
```

Apply the new migration locally with `npm run db:migrate`, then restart both `npm run dev:api` and `npm run dev`. Do not apply it to the Render database during this local-only review.

1. Create or use an existing account, save a pet, and note your next Discover pet.
2. Open Sign in, select **Forgot password?**, enter the account email, and select **Send reset link**. The acknowledgment is also shown for unknown addresses, which receive no message.
3. Open [Mailpit](http://localhost:8025), find **Reset your Pawprint password**, and open its link. You do not need a domain, external mail account, or provider key.
4. Try mismatched passwords, then correct them and complete the reset. The existing policy is 8–128 characters. You return to Sign in; the new password works and the old one fails. Previous sessions are invalid, while Matches and Discover progress remain unchanged.
5. Request two links and verify only the newest works. Reopening a used link shows **This reset link is invalid or has expired** with **Request a new link**. Merely opening a valid form does not consume the link.

Links expire after 30 minutes. Their token is in the URL fragment, which the browser sends in request bodies rather than access-log URLs. The database retains only a SHA-256 token digest. Password hashing uses Better Auth's public password hasher. One reset record per account, an account lock, and a database transaction enforce latest-link checks, consumption, password replacement, and session revocation together. Native Better Auth reset routes are blocked so they cannot bypass this policy.

The dedicated test inbox defaults to port 8026 to keep it separate from manual review on 8025. Override `TEST_MAILPIT_ORIGIN` when needed. The production verification command above uses the local production build with recovery explicitly opted in and confirms that it still remains disabled; it uses only the disposable test database.

To stop the manual-review inbox:

```sh
docker compose -f compose.mailpit.yaml down
```

Do not add these local settings or a Mailpit service to Render. Real delivery and production activation require a later approved feature.

## Render deployment

The [Render Blueprint](render.yaml) defines two public Free web services in Ohio: Next.js (UI and BFF) and Express (API). They use your existing Render PostgreSQL database in the same workspace and region. Browser application requests go through Next.js, which calls Express over HTTPS. Express validates sessions for protected endpoints.

| Service | Build | Start |
| --- | --- | --- |
| Next.js | `npm ci --include=dev && npm run build` | `npm start` |
| Express | `npm ci --include=dev` | `npm run start:api:render` |

`start:api:render` runs migrations, then the idempotent catalog seed, then starts Express. A migration or seed failure stops startup. Free web services do not support a pre-deploy command, so these steps run on every API restart, including wake-ups after inactivity. Keep a single API instance and review migration compatibility before future releases.

Set these environment variables during Blueprint setup:

| Service | Variable | Value |
| --- | --- | --- |
| Next.js | `PAWPRINT_API_ORIGIN` | The API's public HTTPS origin, for example `https://pawprint-ai-api.onrender.com`. Use the actual assigned hostname. |
| Express | `BETTER_AUTH_URL` | The Next.js public HTTPS origin, without a trailing slash. This is the browser-facing origin, not the API URL. |
| Express | `DATABASE_URL` | Your existing database's Internal Database URL. |
| Express | `BETTER_AUTH_SECRET` | Generated automatically by the Blueprint. Keep it stable across deployments. |
| Express | `API_HOST` | `0.0.0.0`, supplied by the Blueprint. |

Next.js uses its own `RENDER_EXTERNAL_URL` as the public origin by default. If you use a custom domain, set the same `BETTER_AUTH_URL` on both services. Only Express needs the database URL and authentication secret. Use the external database URL with `sslmode=verify-full` when connecting from your computer. Add `?sslmode=verify-full` if the URL has no query string, or `&sslmode=verify-full` if it already has query parameters.

1. After release approval, merge the release to `master`. In Render, create a Blueprint from the GitHub repository on `master`. Confirm both services have the Free compute plan. The existing database keeps its current plan and billing.
2. Enter the expected API origin and Next.js origin. After provisioning, check the actual assigned HTTPS URLs. Correct `PAWPRINT_API_ORIGIN` on Next.js and `BETTER_AUTH_URL` on Express if necessary, then redeploy the affected services before testing sign-in. A service's assigned hostname may differ from its Blueprint name.
3. Confirm the API startup logs show successful migrations and seeding. Open `https://<actual-api-host>/health` and expect HTTP 200. Both services use manual deploys. For subsequent releases, deploy Express first, then Next.js from the same Git commit.
4. At the Next.js URL, create a test account, sign out and sign back in, pass Luna, and save Milo. Reload Discover and confirm it shows Bella. Open Matches and confirm it shows Milo once. Open Matches in a signed-out window and confirm it redirects to Sign in.
5. Request `https://<actual-api-host>/api/discover` without a cookie and expect HTTP 401. In the browser's Network panel, confirm application requests use the Next.js origin. CORS configuration is unnecessary for this server-to-server BFF flow.

Free web services sleep after 15 minutes without traffic and can take about a minute to wake up. When both services are asleep, initial sign-in or catalog requests can be slow or need a retry. The workspace's 750 monthly Free instance hours are shared between both services; this does not cover running two services continuously all month. Free services have no dashboard shell. Render recommends Free instances for learning and previews rather than production availability.

If you already created Express as a Private Service, Render cannot change its service type in place. Create a new Web Service for the API, using a distinct Blueprint service name if the old name is already managed. Update Next.js to use the new API HTTPS origin and verify the app before deleting the old paid service. Keeping the old service running continues its billing.

For platform behavior, see [Render Free instances](https://render.com/docs/free) and [Render Blueprint YAML](https://render.com/docs/blueprint-spec).
