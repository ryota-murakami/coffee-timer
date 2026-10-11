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

## Docs

### Contributor docs drift

**What:** Bring `README.md` and `CLAUDE.md` in line with the repository.

**Why:** `README.md` advertises `pnpm e2e`, which runs all 21 Playwright projects including the stale visual ones, and it does not mention `playwright install`. `CLAUDE.md` lists `pnpm test:a11y` (no such script), `middleware.ts` (the file is `proxy.ts`) and `tests/accessibility.spec.ts` (the specs are under `e2e/`).

**Context:** The scripts that match CI are `pnpm e2e:desktop`, `pnpm e2e:mobile` and `pnpm e2e:tablet`. Each needs a production build first.

**Effort:** S
**Priority:** P3
**Depends on:** None

## Completed
