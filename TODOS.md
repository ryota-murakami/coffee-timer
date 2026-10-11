# TODOS

## Timer

### On-device session history

**What:** Bring back a history of completed timers that is stored only on the device (localStorage or IndexedDB), with no account and no server.

**Why:** The My Page history (calendar heatmap, timeline, summary stats) was removed together with login and the database. People who liked seeing their past sessions have no replacement.

**Context:** The removed implementation lives at `8d503ca:components/mypage/` and `8d503ca:lib/hooks/useTimerSessions.ts`. Its UI can be restored from there; only the data source has to change from the old history API to a local store. Completion is already detected in `lib/hooks/useTimerCompletion.ts`, which is the place to record a session.

**Effort:** L
**Priority:** P3
**Depends on:** None

## Testing

### Refuse a foreign server on port 3009

**What:** Make Playwright fail fast when the server answering on port 3009 is not this app, or allow the port to be overridden.

**Why:** `playwright.config.ts` reuses any server on port 3009 outside CI. When another project holds that port, the e2e suite runs against the wrong application.

**Context:** Observed on 2026-10-11 with another local project listening on 3009. A global setup that requests `/api/manifest` and checks the app name would be enough. `docs/meticulous.md` also suggests `kill-port 3009`, which can stop an unrelated server.

**Effort:** S
**Priority:** P2
**Depends on:** None

### Local e2e can hang on the third-party recorder script

**What:** Make the e2e suite independent of the Meticulous recorder, for example by blocking `snippet.meticulous.ai` in Playwright or by not injecting the snippet into builds that Playwright serves.

**Why:** When a local `.env` sets `NEXT_PUBLIC_METICULOUS_PROJECT_ID`, `app/[locale]/layout.tsx` adds a synchronous `<script>` from `snippet.meticulous.ai`. If that request stalls, the page never fires `load`, `page.goto` waits for the full 30 s test timeout, and a random test fails.

**Context:** Observed on 2026-10-11: 2 of 9 full `Desktop Chrome` runs lost one test each (`pwa-shortcuts`, then `glass-number-stepper`), and the Playwright trace showed the pending snippet request. CI has no `.env`, so it is not affected. Until this is fixed, build and run locally with the variable empty: `NEXT_PUBLIC_METICULOUS_PROJECT_ID= pnpm build`, then the same prefix on `pnpm e2e:desktop`. A project then takes about 18 s instead of about 40 s.

**Effort:** S
**Priority:** P2
**Depends on:** None

### Tablet projects do not run Safari

**What:** Replace `devices['iPad Pro landscape']` in `playwright.config.ts` with a descriptor that exists (for example `iPad Pro 11 landscape`) and re-baseline the tablet snapshots.

**Why:** The key does not exist in Playwright 1.63.0, so `Tablet Safari` and the six `Tablet-*` projects fall back to Chromium at 1280x720. CI has no WebKit coverage even though a job is named for it.

**Context:** Seven projects use the missing key. Fixing it moves them to WebKit at a tablet viewport, which changes every tablet baseline and may surface WebKit-only failures. Do it together with a visual re-baseline.

**Effort:** M
**Priority:** P2
**Depends on:** Re-baselining the visual snapshots

## Routing

### Root 404 has no document shell

**What:** Give `app/not-found.tsx` its own `<html>`, `<body>`, stylesheet import and a link to `/`.

**Why:** `app/layout.tsx` passes children through, so any unknown URL whose first segment is not a locale (`/api/*`, unknown `/shortcuts/*`, missing files) gets an HTTP 404 with an unstyled fragment and no way back.

**Context:** Measured on a production build on 2026-10-11: the body is about 5 KB with no `<html>` or `<body>` tag. URLs under `/en` and `/ja` are fine; they use `app/[locale]/not-found.tsx` through the catch-all route.

**Effort:** S
**Priority:** P3
**Depends on:** None

### Localized 404 is drawn by the browser, not by the server

**What:** Decide whether unknown URLs under `/en` and `/ja` should return a server-rendered 404 document, and change the 404 setup if so.

**Why:** The response for such a URL has HTTP 404 and `noindex`, but its HTML is the framework error shell (`<html id="__next_error__">` with an empty body). The heading and the link back to the timer appear only after JavaScript runs, so a visitor without JavaScript sees a blank page.

**Context:** Measured on a production build on 2026-10-11 with `curl http://localhost:4319/en/mypage`; the 404 copy is only in the serialized payload. In a browser the page renders correctly, and `e2e/removed-routes.spec.ts` covers that. Next.js builds this shell when `notFound()` is thrown while rendering the page (`getErrorRSCPayload` in `next/dist/server/app-render/app-render.js`). The experimental `globalNotFound` option gives a server-rendered page, but it bypasses the locale layout, so the localized copy and the theme would need another source. Whether a different layout structure avoids the shell has not been checked.

**Effort:** M
**Priority:** P3
**Depends on:** None

## Docs

### Contributor docs drift

**What:** Bring `README.md` and `CLAUDE.md` in line with the repository.

**Why:** `README.md` advertises `pnpm e2e`, which runs all 21 Playwright projects including the stale visual ones, and it does not mention `playwright install`. `CLAUDE.md` lists `pnpm test:a11y` (no such script), `middleware.ts` (the file is `proxy.ts`) and `tests/accessibility.spec.ts` (the specs are under `e2e/`).

**Context:** The scripts that match CI are `pnpm e2e:desktop`, `pnpm e2e:mobile` and `pnpm e2e:tablet`. Each needs a production build first.

**Effort:** S
**Priority:** P3
**Depends on:** None

## Completed
