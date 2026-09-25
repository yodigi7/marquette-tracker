# Design

## Context

The application is a Vite-built React PWA with a single HTML entry point, client-side routes, a generated Workbox service worker, and Dexie-backed browser-local storage. The repository is public and currently has no GitHub Pages publication workflow. A project Pages site is served from `/marquette-tracker/`, while the current router assumes the origin root and the manifest explicitly starts at `/`.

The deployment must preserve the existing offline-first model: no backend, no network persistence, and no change to the pure Marquette engine or IndexedDB schema. The static host must be able to serve the project document while fixed and dynamic client routes remain directly openable.

## Goals / Non-Goals

**Goals:**

- Publish the production build automatically on pushes to `main`, with a manual recovery trigger.
- Make all generated assets and PWA resources resolve under `/marquette-tracker/`.
- Use hash-based client routes so fixed and dynamic routes work on GitHub Pages without a server rewrite or `404.html` application fallback.
- Keep the existing service-worker offline shell and browser-local data behavior.
- Run the repository's test, lint, and build gates before publication.
- Document the one-time Pages setting and the resulting deployment URL.

**Non-Goals:**

- Adding a backend, authentication, cloud storage, or cross-device synchronization.
- Changing the fertility engine, data model, or medical interpretation behavior.
- Creating a multi-page build for each application route.
- Providing clean path-style URLs without a fragment; those require a host-level rewrite or a fallback page.
- Supporting a custom domain in this change.

## Decisions

### Use hash routing instead of a static-host route fallback

The app will use the router's hash-based mode. The browser will request `/marquette-tracker/` and retain `#/`, `#/status`, `#/history`, or `#/cycle/<id>` for client-side route state.

**Why:** GitHub Pages serves files, not application routes. A hash is not sent in the HTTP request, so the existing `index.html` is always the document requested. This handles the dynamic cycle route without generating files for runtime-created IDs and avoids a `404.html` shell.

**Alternatives considered:**

- `BrowserRouter` plus `404.html`: preserves clean paths but relies on a non-200 fallback and duplicates the built shell.
- Multi-page Vite build: works for fixed routes but cannot pre-generate arbitrary cycle IDs and would still require client rendering for IndexedDB data.
- Netlify/Vercel/Cloudflare rewrites: provide clean paths and normal 200 responses, but add another hosting platform and are unnecessary for the current free GitHub Pages goal.

### Use a repository-specific Vite base

The Vite build will use `/marquette-tracker/` as its public base path. Generated JavaScript, CSS, icons, the manifest link, and the service-worker registration will therefore resolve inside the project site rather than at the GitHub user's root.

The PWA manifest's `start_url` and `scope` will be aligned with that base, using base-derived or project-relative values rather than the current root `/`. This is required for the installed PWA to launch and remain scoped to the correct application.

**Alternative considered:** A root deployment or custom domain would allow `/` as the base, but it is outside this change and would introduce a different origin/data-storage migration concern.

### Publish with the official GitHub Pages Actions pipeline

A repository workflow will trigger on pushes to `main` and on manual dispatch. It will use the existing pnpm lockfile, run the required quality gates, build the `dist/` directory, upload the Pages artifact, and deploy it through GitHub's Pages actions. The workflow will use least-privilege Pages permissions and a `github-pages` environment.

The repository's Pages source will be set to **GitHub Actions** in repository settings. The workflow will not publish feature branches or create a `gh-pages` branch.

**Alternative considered:** Publishing a prebuilt branch would require checking generated output into Git and would be less reproducible for a Vite/PWA build.

### Preserve the existing PWA and storage architecture

The existing `vite-plugin-pwa` generation and auto-update registration remain in use. The service worker will precache the built application shell and static assets. Dexie/IndexedDB remains the sole persistence layer; deployment adds no API calls or data replication.

**Trade-off:** A user who changes from the Pages URL to a different origin, such as a future custom domain, will not automatically carry browser-local data to the new origin because this MVP has no export/import flow.

## Risks / Trade-offs

- **Hash URLs are less polished than path URLs** -> Accept for reliable static hosting; preserve route labels and logical destinations so navigation behavior remains unchanged.
- **The repository name or Pages base changes** -> Keep the base in one Vite configuration source, verify the generated manifest/service worker, and document the required update before renaming the repository.
- **A root-relative PWA URL leaks to the GitHub user root** -> Assert or inspect the generated manifest and registration URLs during verification; reject root `/` metadata.
- **Pages settings are not enabled or workflow permissions are insufficient** -> Document the one-time repository setting and inspect the first workflow run before treating the site as published.
- **The service worker caches an older release** -> Use the existing auto-update configuration and verify an offline reload after a successful deployment.
- **The public Pages site exposes application code and visitor network metadata** -> Keep all cycle data browser-local and do not add secrets or user records to the repository.
- **The first deployment is not made from the current local working tree** -> Push and verify the intended `main` commit; use the manual workflow trigger for recovery rather than relying on local state.

## Migration Plan

1. Update the Vite/PWA base metadata and switch the application entry point to hash-based routing.
2. Add the GitHub Pages workflow and deployment documentation, without changing application data or engine files.
3. Configure the repository's Pages source as GitHub Actions.
4. Push the deployment change to `main` and run the test, lint, and build gates in the workflow.
5. Verify the project root, fixed hash routes, dynamic cycle route, manifest, service-worker scope, installability, offline reload, and local data persistence.
6. If the deployment is unhealthy, revert the deployment commit on `main` (or rerun the last known-good `main` revision) and inspect the resulting Pages artifact.

## Open Questions

None for this change. A future custom-domain deployment or cross-device data requirement should be planned separately because it changes the base-path and storage-origin model.
