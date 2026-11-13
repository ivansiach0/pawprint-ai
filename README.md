# Pawprint

Pawprint is a pet discovery app. The first milestone is the public landing page.

## Local development

Use Node.js 22. From the project root:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Check the introduction at desktop and mobile widths.

## Verification

```sh
npx playwright install chromium
npm test
npm run lint
npm run typecheck
npm run build
```

The browser smoke test covers the signed-out homepage in desktop and mobile Chromium profiles. Run `npm start` after the build to serve the production bundle locally.

The landing photo comes from the supplied [pet catalog](https://pets-images.dev-apis.com/pets/dog1.jpg).
