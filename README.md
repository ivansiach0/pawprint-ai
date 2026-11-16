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
npm run dev:api
```

In another terminal, run `npm run dev` and open [Pawprint](http://localhost:3000). Create an account, reload Discover, and try signing in again from a private browser window.

## Verification

Use a separate disposable database for automated tests. With the Docker container above, create it once with `docker exec pawprint-dev-db createdb -U pawprint pawprint_test`. The test runner applies migrations and starts both services on loopback.

```sh
npx playwright install chromium
TEST_DATABASE_URL=postgresql://pawprint:pawprint_local@127.0.0.1:55432/pawprint_test npm test
npm run lint
npm run typecheck
npm run build
```

The browser tests cover the public homepage, registration, session persistence, and sign-in in desktop and mobile Chromium profiles. They also check that Express rejects a direct request to Discover without a session.

The landing photo comes from the supplied [pet catalog](https://pets-images.dev-apis.com/pets/dog1.jpg).
