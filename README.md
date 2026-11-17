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

Use a separate disposable database for automated tests. With the Docker container above, create it once with `docker exec pawprint-dev-db createdb -U pawprint pawprint_test`. The test runner applies migrations, seeds pets, and starts both services on loopback.

```sh
npx playwright install chromium
TEST_DATABASE_URL=postgresql://pawprint:pawprint_local@127.0.0.1:55432/pawprint_test npm test -- --workers=1
npm run lint
npm run typecheck
npm run build
```

The browser tests cover the public homepage, registration, session persistence, first pet after reload, sign-in, and sign-out in desktop and mobile Chromium profiles. They also check that Express rejects a direct request to Discover without a session.

The landing photo comes from the supplied [pet catalog](https://pets-images.dev-apis.com/pets/dog1.jpg).

Playwright saves screenshots for failed tests in `test-results/`.

## Render deployment

The [Render Blueprint](render.yaml) defines a public Next.js web service, an Express private service, connected to your existing Render PostgreSQL database in Ohio. All resources must be in the same Render workspace. Review the paid compute and storage plans in the [Render dashboard](https://dashboard.render.com/) before applying the Blueprint.

| Service | Build | Before deployment | Start |
| --- | --- | --- | --- |
| Next.js | `npm ci --include=dev && npm run build` | | `npm start` |
| Express | `npm ci --include=dev` | `npm run db:migrate && npm run db:seed` | `npm run start:api` |

During Blueprint setup, set the API's DATABASE_URL to your existing database's Internal Database URL. Render generates an authentication secret for Express. It passes the Express internal address to Next.js and publishes an HTTPS URL for the web service. Use the internal database URL for the deployed API. Use the external URL with `sslmode=verify-full` when connecting from your computer. Add `?sslmode=verify-full` if the URL has no query string, or `&sslmode=verify-full` if it already has query parameters.

1. After release approval, merge the release to `master`. In Render, create a Blueprint from the GitHub repository on `master`.
2. Enter the browser-facing HTTPS origin for the API's `BETTER_AUTH_URL`, without a trailing slash. If the final hostname is assigned during provisioning, use the expected origin during setup, then update the API environment to the exact URL shown on the web service and deploy the API again before testing sign-in. Next.js uses Render's public URL by default. If you use a custom domain, set the same `BETTER_AUTH_URL` on both services.
3. Confirm that the API pre-deploy logs show successful migrations and seeding. Both services use manual deploys. For subsequent releases, deploy Express first, then deploy Next.js from the same Git commit.
4. At the public URL, create a test account, sign out and sign back in, pass Luna, and save Milo. Reload Discover and confirm it shows Bella. Open Matches and confirm it shows Milo once. Open Matches in a signed-out window and confirm it redirects to Sign in.
5. In Render, confirm Express has type **Private Service** and an internal address. From the Next.js service shell, request `http://$PAWPRINT_API_HOSTPORT/health` and expect HTTP 200. Use the public Next.js URL for browser traffic.

For deployment fields and networking details, see [Render Blueprint YAML](https://render.com/docs/blueprint-spec) and [Render private networking](https://render.com/docs/private-network).
