# Meticulous recording and CI guide

This note records the current Meticulous behavior and the recommended setup for Coffee Timer. It is based only on Meticulous's official documentation and official `alwaysmeticulous` repositories, plus GitHub's official documentation for fork-secret behavior.

## Executive summary

- A recording is a **session**, but not every recorded session is automatically part of the CI test suite. Meticulous continuously chooses a coverage-maximizing subset called **Selected Sessions**. A critical flow can be forced into the suite with **Add to selected sessions**. [Manual recording](https://app.meticulous.ai/docs/how-to/manually-recording-tests) · [Session selection](https://app.meticulous.ai/docs/how-to/testing-pool)
- The recorder should be a synchronous native `<script>` in the initial server-rendered `<head>`, before application scripts. Do not use `async`, `defer`, or Next.js `Script`. This is necessary to wrap `fetch` and `XMLHttpRequest` before application code captures their native references. [Recorder installation](https://app.meticulous.ai/docs/recorder-installation) · [Capturing early requests](https://app.meticulous.ai/docs/how-to/ensure-recorder-captures-all-requests)
- Localhost is a supported and explicitly recommended recording environment. The normal recorder, the Meticulous CLI, and existing Playwright tests can all generate sessions. [Onboarding](https://app.meticulous.ai/docs/onboarding-guide) · [Ingest existing tests](https://app.meticulous.ai/docs/session-recording/ingest-existing-tests)
- The official current recommendation for a server-rendered Next.js application is `upload-container@v1`. `cloud-compute@v1` is a tunnel-based fallback when a container is not practical. The `github-actions-v2` URL is the name of the setup guide; the current action major version is still `@v1`. [Next.js App Router guide](https://app.meticulous.ai/docs/frameworks/nextjs/app-router) · [Official action repository](https://github.com/alwaysmeticulous/report-diffs-action)
- Coffee Timer currently has no Dockerfile, so its existing `cloud-compute@v1` approach is a reasonable incremental path. The official Next.js configuration documents companion assets for `/_next/static/`, but the current Meticulous API rejects that documented regex; Coffee Timer therefore uses the supported tunnel-only configuration until the upstream incompatibility is fixed.
- Source coverage requires browser source maps. Coffee Timer enables Next.js production browser source maps only when `METICULOUS_BUILD=true`, which the Meticulous workflow already sets, so normal production builds do not publish application source maps. [Source coverage](https://app.meticulous.ai/docs/how-to/enable-source-coverage) · [Next.js production browser source maps](https://nextjs.org/docs/app/api-reference/config/next-config-js/productionBrowserSourceMaps)

## How recording becomes a CI test

Meticulous records interactions, DOM changes, and network requests/responses. During replay it restores recorded cookies, local storage, session storage, and stubs XHR, Fetch, and WebSocket responses by default. Static assets are loaded live and are not stubbed. For Next.js App Router, the project setting should be **Stub all requests, apart from requests for server components and static assets** so RSC requests reach the running application. [FAQ](https://app.meticulous.ai/docs/faq-and-troubleshooting) · [Next.js network stubbing](https://app.meticulous.ai/docs/frameworks/nextjs/app-router#network-stubbing-for-server-components)

The lifecycle is:

1. A manual or automated browser interaction creates a session.
2. Meticulous replays new sessions, measures code/component/route coverage, and updates Selected Sessions.
3. CI replays Selected Sessions against the PR head and base commit, then compares the resulting snapshots.
4. To guarantee a critical flow is always included, open that session in the Dashboard and click **Add to selected sessions**. [Session selection](https://app.meticulous.ai/docs/how-to/testing-pool)

Therefore, “the Dashboard shows recordings” and “CI runs those recordings” are related but separate checks. Validate both the **All Sessions** tab and the **Selected Sessions** tab.

## Source coverage

Meticulous calculates source coverage from the JavaScript executed during replay. It can map generated browser bundles back to repository files when the tested app serves source maps with the same filename plus `.map`, points to them through a `sourceMappingURL`, or uses a `SourceMap` response header. [Source coverage](https://app.meticulous.ai/docs/how-to/enable-source-coverage)

`next.config.ts` sets `productionBrowserSourceMaps` only when `METICULOUS_BUILD=true`; Next.js then writes browser `.js.map` files, adds `sourceMappingURL` references to the JavaScript bundles, and serves the maps through `next start`. The Meticulous workflow sets this build flag for both main and pull-request replay builds. Local development, ordinary production builds, and deployed builds remain unchanged unless the flag is explicitly enabled.

Verify the build output and HTTP behavior with:

```bash
METICULOUS_BUILD=true pnpm build
rg --files .next/static -g '*.js.map'
kill-port 3009
pnpm start
```

Open `http://localhost:3009/en`, inspect a loaded `/_next/static/chunks/*.js` response, find its final `sourceMappingURL` comment, and request that map URL from the same chunks directory. Both requests should return HTTP `200`. After the Meticulous workflow completes, open the project **Overview**, select **View coverage & snapshots**, and use the **Sources** tab to inspect file and line coverage.

## Recorder installation and localhost verification

Coffee Timer already follows the essential integration pattern:

- `app/[locale]/layout.tsx` emits a native synchronous script in `<head>`.
- `lib/constants/meticulous.ts` uses `https://snippet.meticulous.ai/v1/meticulous.js`.
- `lib/utils/getMeticulousProjectId.ts` gates it on `NEXT_PUBLIC_METICULOUS_PROJECT_ID`.

For local recording, set the project ID in the uncommitted local environment, start `pnpm dev`, and use `http://localhost:3009/en` or `/ja`. Confirm all of the following:

1. The initial HTML contains the recorder script.
2. The browser Network panel loads `https://snippet.meticulous.ai/v1/meticulous.js` before application network activity.
3. `window.Meticulous` exists.
4. After interacting with the app, the session appears under Dashboard → All Sessions.
5. `window.Meticulous.record.getSessionUrl()` returns the current session page. [Manual recording](https://app.meticulous.ai/docs/how-to/manually-recording-tests)

If localhost interactions do not appear, use `?meticulousForceRecording=true` as a diagnosis. For internal/non-production recording, `data-is-production-environment="false"` raises the abandonment threshold; `data-force-recording="true"` disables abandonment. These attributes affect recorder load handling, not environment enablement, so enabling the recorder must still be controlled separately. [Recorder troubleshooting](https://app.meticulous.ai/docs/how-to/troubleshoot-recorder)

Recorded requests can include authorization tokens and headers even though plaintext passwords are redacted. Only trusted users should have organization access. The Meticulous API token also grants access to recorded sessions and must remain secret. [Recorder installation](https://app.meticulous.ai/docs/recorder-installation) · [CI setup](https://app.meticulous.ai/docs/github-actions-v2)

## One user flow per recording

### Manual / CLI recording

For deliberate, clearly bounded recordings, the official CLI is the least ambiguous option:

```bash
npx @alwaysmeticulous/cli record session --apiToken="$METICULOUS_API_TOKEN"
```

It opens a blank browser. Navigate to `http://localhost:3009/en`, perform exactly one flow, then close the browser. The CLI prints the resulting session link(s). A multi-page navigation may create separate sessions per page so they can replay in parallel. Replay the result locally from the session's **Simulate** tab before selecting it. [Manual recording](https://app.meticulous.ai/docs/how-to/manually-recording-tests)

Repeat the command for each desired flow. This gives the clearest practical “one browser run = one intended test flow” boundary.

### Playwright-generated recording

Meticulous officially supports ingesting existing Playwright tests. Requirements are:

1. The recorder is present while the Playwright page runs.
2. At the end of every test, and before page close or full-page navigation, await:

   ```ts
   await page.evaluate(() => window.Meticulous.record.flush())
   ```

3. In Dashboard → All Sessions, disable **Hide Automated Sessions** to see them. [Ingest existing tests](https://app.meticulous.ai/docs/session-recording/ingest-existing-tests)

The public recorder API exposes `flush()` and `getSessionUrl()`, but no public “start a new session” or “stop this session” method. `flush()` sends buffered data; it is not documented as splitting the current session. [Official public Window API](https://github.com/alwaysmeticulous/meticulous-sdk/blob/82bc03633f0c63e196ce5cf4bd5575fcf65a5bdb/packages/sdk-bundles-api/src/window-api/public-window-api.ts#L192-L237)

Accordingly, for predictable automation boundaries, use one fresh Playwright page/context per test, keep one observable user journey in that test, and flush before teardown. This final sentence is an implementation inference from the official ingest requirements and public API, not a documented Meticulous guarantee about session identifiers.

## Coffee Timer recording set

Record focused flows instead of one long “everything” session. This repository's dedicated ingestion suite at `e2e/meticulous/recording.spec.ts` records nine isolated journeys:

1. Direct duration entry, plus/minus steppers, keyboard arrows, and boundaries.
2. Start, pause, resume, and reset.
3. Countdown to zero, completion sound request, restart, and reset.
4. Light, Dark, Coffee, and all deterministic Liquid Glass themes.
5. Sound preview/selection, volume extremes, notification toggling, and a test notification.
6. English-to-Japanese locale switching and Japanese settings UI.
7. PWA settings shortcut handling.
8. PWA start shortcut handling.
9. Critical timer and settings controls at the mobile viewport.

Run the suite locally with:

```bash
kill-port 3009
pnpm meticulous:record
```

`playwright.meticulous.config.ts` starts `pnpm dev` when port 3009 is free, opens headed Chromium so browser notification permission behaves realistically, uses one worker, and gives every test a fresh browser context. `openMeticulousRecording` adds `?meticulousForceRecording=true` only to these dedicated journeys and fails if the recorder is missing. `flushMeticulousRecording` awaits `window.Meticulous.record.flush()` before teardown and prints each Dashboard session URL. The main `playwright.config.ts` excludes this directory so ordinary E2E runs do not force remote sessions accidentally.

The browser-owned notification permission prompt is intentionally not replayed because it is nondeterministic in headless CI. The notification journey grants permission through Playwright, then records the in-app toggle and **Send test** action. The System theme is also excluded because its visual result depends on the host color scheme; all six deterministic theme variants are recorded instead.

After ingestion, inspect every generated session, replay it locally, and manually select the business-critical flows. Do not assume that merely recording all existing Playwright tests makes all of them run in CI.

## Existing recording

The existing recording does not need to be deleted before recording more flows. New sessions are added to the pool, and Meticulous continuously updates the selected combination as the app changes. A manually pinned recording can be unpinned with **Remove from selected sessions**. [Session selection](https://app.meticulous.ai/docs/how-to/testing-pool)

If an old session becomes unreplayable after the UI/API changes, Meticulous documents that it can safely be ignored: it detects lost coverage and selects newer sessions to cover those paths. [Failed simulation troubleshooting](https://app.meticulous.ai/docs/how-to/troubleshoot-failed-simulations)

Recommended handling for the current single recording:

- Keep it if it replays cleanly and represents a useful flow.
- Remove it from Selected Sessions if it is redundant, excessively long, or flaky.
- Add the new focused sessions, then inspect coverage before deciding whether the old recording adds unique value.

## GitHub Actions requirements

Before CI can report correctly:

1. Install the [Meticulous GitHub App](https://github.com/apps/alwaysmeticulous/installations/new).
2. Add repository Actions secret `METICULOUS_API_TOKEN` from the matching Meticulous project's settings.
3. Run the workflow on main pushes, pull requests, and `workflow_dispatch`.
4. Grant all officially required permissions:

   ```yaml
   permissions:
     actions: write
     contents: read
     issues: write
     pull-requests: write
     statuses: read
   ```

These permissions are used to manage the status check and PR feedback. Meticulous states that it will not work without them. [CI setup](https://app.meticulous.ai/docs/github-actions-v2)

Repository secrets other than `GITHUB_TOKEN` are not provided to workflows triggered by fork pull requests, and the fork PR `GITHUB_TOKEN` is read-only. Consequently, `METICULOUS_API_TOKEN`-dependent runs will not work normally for untrusted fork PRs unless repository policy explicitly changes that behavior; do not switch to `pull_request_target` merely to expose the token to contributor code. [GitHub secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets) · [GitHub fork events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflows-in-forked-repositories)

Coffee Timer skips the Meticulous job for fork pull requests and Dependabot pull requests, where the required repository secret is unavailable. Same-repository pull requests, main pushes, and manual dispatches continue to run the visual replay.

## Correct `cloud-compute` workflow for this repository

Official guidance now prefers `upload-container@v1` for Next.js. Coffee Timer currently uses this tunnel-only workflow:

```yaml
name: Meticulous Tests

on:
  push:
    branches: [main]
  pull_request: {}
  workflow_dispatch: {}

permissions:
  actions: write
  contents: read
  issues: write
  pull-requests: write
  statuses: read

jobs:
  test:
    if: >-
      github.event_name != 'pull_request' ||
      (github.event.pull_request.head.repo.full_name == github.repository &&
      github.event.pull_request.user.login != 'dependabot[bot]')
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build Next.js app
        run: pnpm build
        env:
          NODE_ENV: production
          METICULOUS_BUILD: 'true'

      - name: Start app
        run: |
          pnpm start &
          npx wait-on http://localhost:3009/en --timeout 60000

      - name: Run Meticulous tests
        uses: alwaysmeticulous/report-diffs-action/cloud-compute@v1
        with:
          api-token: ${{ secrets.METICULOUS_API_TOKEN }}
          app-url: 'http://localhost:3009'
```

The action's `github-token` input defaults to `${{ github.token }}`. `api-token` and `app-url` are the required single-project inputs; the other tunnel inputs are optional. [Official cloud-compute action definition](https://github.com/alwaysmeticulous/report-diffs-action/blob/main/cloud-compute/action.yml)

The repository's `.github/workflows/meticulous.yml` has the essential triggers, permissions, secret, production build, live server, and `cloud-compute@v1`. The optional companion-assets inputs are intentionally disabled: on 2026-07-16, the live API returned HTTP 400 for the officially documented `^/_next/static/` regex before any replay began. The tunnel serves those static assets without the optimization, which preserves correctness while avoiding the incompatible request. Re-enable companion assets after Meticulous accepts its documented configuration. [Companion assets guide](https://app.meticulous.ai/docs/how-to/companion-assets-advanced)

## Branch and first-run behavior

- Meticulous needs both the main-branch run and PR runs. It compares replay snapshots for the PR head against the base commit. Build/runtime configuration must be the same on both sides to avoid environmental false diffs. [FAQ](https://app.meticulous.ai/docs/faq-and-troubleshooting)
- `workflow_dispatch` lets Meticulous lazily request a missing base run. It is required by the official workflow template. [Official action repository](https://github.com/alwaysmeticulous/report-diffs-action#required-workflow-setup)
- The PR that first adds the workflow generally has no useful diff result because main has no baseline run yet. Merge it, wait for a successful main run, then open a second PR to verify comparison. [CI setup](https://app.meticulous.ai/docs/github-actions-v2)
- PR comments are disabled by default for new Meticulous projects; runs remain visible under Dashboard → Test runs. The GitHub App can add a check that stays red for unapproved visual differences and can be made a required check. [CI setup](https://app.meticulous.ai/docs/github-actions-v2)

## Acceptance checklist

- Recorder script is first, synchronous, and visible in initial HTML on localhost.
- Multiple focused manual/CLI or Playwright-generated sessions appear in All Sessions.
- Automated sessions are visible when **Hide Automated Sessions** is disabled.
- Every critical Coffee Timer flow replays locally without error.
- Critical flows are in Selected Sessions, either automatically or manually.
- GitHub App is installed and `METICULOUS_API_TOKEN` is configured for the same project.
- Workflow succeeds on main and creates a base test run.
- A subsequent PR produces a head-vs-base Meticulous test run.
- Meticulous builds emit and serve browser `.js.map` files, and the Dashboard **Sources** tab shows repository file coverage.
- Next.js project settings pass through RSC/static asset requests.
- Fork/Dependabot pull requests safely skip the job when the API secret is unavailable.
