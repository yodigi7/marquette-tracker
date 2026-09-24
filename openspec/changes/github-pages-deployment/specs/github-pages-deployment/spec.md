# Spec Delta

## Purpose

Enables repeatable publication of the Marquette Tracker PWA through GitHub Pages while preserving repository-subpath loading, direct navigation, offline startup, and browser-local data.

## ADDED Requirements

### Requirement: Automatic Pages publication

The project SHALL publish a successful production build to GitHub Pages after each push to `main` and SHALL provide a manual workflow trigger for a deliberate rebuild or recovery.

#### Scenario: Main-branch push publishes the application
- **WHEN** a commit is pushed to the `main` branch and the quality gates succeed
- **THEN** the workflow publishes the resulting production build to the repository's GitHub Pages site

#### Scenario: Manual rebuild is available
- **WHEN** an authorized maintainer starts the deployment workflow manually
- **THEN** the workflow rebuilds and publishes the current `main` revision without requiring a new commit

#### Scenario: Feature-branch pushes do not publish
- **WHEN** a commit is pushed only to a branch other than `main`
- **THEN** the production GitHub Pages site is not replaced by that branch's build

### Requirement: Repository-subpath application loading

The deployed application SHALL load its document, static assets, PWA manifest, icons, and service worker from the repository's `/marquette-tracker/` Pages path.

#### Scenario: Project root opens the application
- **WHEN** a visitor opens `https://yodigi7.github.io/marquette-tracker/`
- **THEN** the Marquette Tracker application loads successfully with resources resolved within `/marquette-tracker/`

#### Scenario: PWA metadata stays within the project scope
- **WHEN** the deployed PWA manifest and service worker are inspected
- **THEN** their start location and scope keep the installed application within `/marquette-tracker/` rather than the GitHub user's root site

### Requirement: Direct navigation through hash routes

The deployed application SHALL represent application routes after the URL fragment so that fixed and dynamic routes can be opened directly on a static host without a server-side route fallback.

#### Scenario: Fixed route opens from a shared URL
- **WHEN** a visitor opens a URL ending in `#/`, `#/status`, `#/history`, or `#/settings`
- **THEN** the corresponding application view renders after the project document loads

#### Scenario: Dynamic cycle route opens from a shared URL
- **WHEN** a visitor opens a URL ending in `#/cycle/<cycleId>` for an existing cycle
- **THEN** the cycle chart view renders for that cycle without requiring a physical server file at the route path

#### Scenario: Hash navigation does not request a missing server route
- **WHEN** the user navigates between application views using the hash URL
- **THEN** the browser requests the project document rather than a server path for each client-side route

### Requirement: Local-first PWA behavior after deployment

The deployed application SHALL retain its browser-local persistence and offline application shell without introducing a network data store or synchronization service.

#### Scenario: Existing local data remains available
- **WHEN** a user returns to the deployed application in the same browser profile
- **THEN** previously stored cycles, day records, and settings remain available from browser-local storage

#### Scenario: Offline application startup
- **WHEN** the application has been previously loaded and the device is offline
- **THEN** the installed or cached PWA can start and display the application without contacting an application backend

### Requirement: Quality-gated deployment

The deployment workflow SHALL run the repository's dependency installation, test, lint, and production-build gates before publishing an artifact.

#### Scenario: Successful gates publish the artifact
- **WHEN** dependency installation, tests, linting, and the production build all succeed
- **THEN** the workflow publishes the newly built artifact

#### Scenario: Failed gates prevent publication
- **WHEN** any required quality gate fails
- **THEN** the workflow reports the failure and does not publish the failed artifact
