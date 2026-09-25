# Tasks

> Prerequisite: archive `calendar-primary-input` before applying this change so its finalized Calendar/Status route contract is the baseline.

## 1. Test the routing contract first

- [x] 1.1 Add a focused router test harness under `src/app/__tests__/` for the final hash routes (`#/`, `#/status`, `#/history`, `#/settings`, and `#/cycle/<id>`); verify the test fails against the current `BrowserRouter` entry before implementation.
- [x] 1.2 Add or update app-shell assertions for Calendar at `#/`, Status at `#/status`, History at `#/history`, and Settings at `#/settings` on wide and narrow navigation surfaces; verify the logical destinations and labels remain unchanged and that no Today or `#/calendar` destination is introduced; run the focused tests with `pnpm test`.

## 2. Configure the SPA for the Pages subpath

- [x] 2.1 Update `src/app/main.tsx` to use hash-based routing while preserving the existing `AppRouter` route definitions; verify the root Calendar, Status, History, Settings, and dynamic cycle views render in the router tests.
- [x] 2.2 Update `vite.config.ts` to use the `/marquette-tracker/` public base and align the PWA manifest start URL and scope with that base; run `pnpm build` and inspect `dist/index.html`, `dist/manifest.webmanifest`, and `dist/sw.js` to confirm no generated URL points at the GitHub user's root.
- [x] 2.3 Confirm the production build still emits the existing service worker and manifest without adding a `404.html` application fallback; verify the generated artifact contains the PWA registration and repository-scoped resources.

## 3. Add automatic Pages publication

- [x] 3.1 [P] Add `.github/workflows/deploy.yml` with `main`-push and manual-dispatch triggers, least-privilege Pages permissions, pnpm setup using `pnpm-lock.yaml`, test/lint/build gates, Pages artifact upload, and Pages deployment; validate the workflow configuration and verify a failed gate cannot reach the deploy step.
- [x] 3.2 [P] Document the one-time repository setting to use **GitHub Actions** as the Pages source, the automatic `main` publication behavior, the manual recovery trigger, and the expected `/marquette-tracker/#/...` URL shape in `README.md`; verify the documented commands and links are accurate.

## 4. Validate the published PWA

- [x] 4.1 Run `pnpm test`, `pnpm lint`, and `pnpm build` from the intended `main` revision; verify all required gates pass and the build artifact is generated from the committed deployment configuration.
- [x] 4.2 After Pages is enabled, manually verify the project root and representative hash links (`#/`, `#/status`, `#/history`, `#/settings`, and `#/cycle/<id>`) load the intended views from `https://yodigi7.github.io/marquette-tracker/` without a server route fallback.
- [x] 4.3 Verify the deployed manifest, service-worker scope, install prompt/start URL, offline reload, and same-browser IndexedDB persistence; confirm that deployment introduces no network data store or synchronization behavior.
- [x] 4.4 Document the rollback procedure for a bad Pages release (revert the deployment commit on `main` or rerun the last known-good revision) and verify the recovery path is understood before marking the change complete.
