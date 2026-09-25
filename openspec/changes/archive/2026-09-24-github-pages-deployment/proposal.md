# Proposal

## Why

The app is a static, offline-first PWA with no backend, so it can be published on GitHub Pages without changing its local-data model. A repeatable deployment is needed to make the app available from the repository's GitHub Pages URL while preserving deep links, PWA installation, and offline behavior under the repository subpath.

## What Changes

- Add an automatic GitHub Pages deployment triggered by pushes to `main`, with a manual workflow trigger for recovery.
- Configure the Vite build and PWA metadata for the repository's `/marquette-tracker/` Pages path.
- Use hash-based client routing so fixed and dynamic routes work on a static host without a server rewrite or `404.html` fallback.
- Validate the production build and PWA behavior before publishing, without adding a backend, cloud sync, or runtime data upload.
- Document the repository Pages setup and deployment behavior for future maintainers.

## Capabilities

### New Capabilities

- `github-pages-deployment`: Covers automatic static publishing, repository-subpath configuration, and production deployment verification for the PWA.

### Modified Capabilities

- `app-shell`: Preserve the finalized Calendar/Status navigation contract—Calendar at `/`, Status at `/status`, History at `/history`, and Settings at `/settings`—while representing those logical routes through the hash-based URL scheme used by the static deployment.

## Impact

- Affects Vite/PWA configuration, the React router entry point, GitHub Actions workflow configuration, and deployment documentation.
- Requires the repository's GitHub Pages source to be configured for GitHub Actions.
- Does not change the Marquette engine, IndexedDB schema, privacy model, or API surface.
- Adds no runtime dependency and introduces no backend or synchronization service.
