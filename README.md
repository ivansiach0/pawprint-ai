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
