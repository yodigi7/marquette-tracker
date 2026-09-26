# Quality Gates Specification

## Purpose

Defines how the project enforces formatting, linting, type checking, testing, and building before changes reach the main branch — the committed style contract, the single canonical command that runs every gate, the local Git hooks that apply them, and the pull-request validation that mirrors them.

## Requirements

### Requirement: Single canonical quality command

The project SHALL provide exactly one command that runs every quality gate — formatting check, linting, type
checking, testing, and production build — and SHALL exit non-zero when any gate fails, identifying the gate
that failed. The type check SHALL be part of this command rather than reachable only through the production
build entry point, and SHALL NOT be executed twice within a single run.

#### Scenario: All gates pass

- **WHEN** every gate succeeds on the current working tree
- **THEN** the canonical command exits with status zero

#### Scenario: A gate fails

- **WHEN** any single gate fails
- **THEN** the canonical command exits non-zero and names the failing gate

#### Scenario: A type error is present

- **WHEN** the working tree contains a TypeScript type error but is otherwise well-formed
- **THEN** the canonical command fails and reports the type error

### Requirement: Individually runnable gates

The project SHALL expose formatting (writing), formatting verification (non-writing), linting, and type
checking as separate commands so a developer can run any one gate alone.

#### Scenario: Formatting command rewrites files

- **WHEN** the formatting command runs over nonconforming files
- **THEN** those files are rewritten to the committed style

#### Scenario: Formatting verification does not modify files

- **WHEN** the formatting verification command runs over nonconforming files
- **THEN** the files on disk are left unchanged and the command exits non-zero naming them

#### Scenario: Type check runs without bundling

- **WHEN** the type-check command runs
- **THEN** the strict TypeScript project check runs and no production bundle is emitted

### Requirement: Repository formatting coverage

Supported source, configuration, and documentation files SHALL be covered by a committed formatter
configuration, and the committed tree SHALL satisfy that configuration with no outstanding differences.

#### Scenario: Clean tree passes verification

- **WHEN** formatting verification runs over the whole repository
- **THEN** it reports no differences and exits zero

#### Scenario: Newly authored conforming file is stable

- **WHEN** a file already matching the committed style is verified
- **THEN** it is reported as already formatted

#### Scenario: Nonconforming file is detected

- **WHEN** a file deviating from the committed style is verified
- **THEN** it is reported as needing formatting

### Requirement: Formatter exclusions for foreign and historical content

The committed formatter configuration SHALL exclude vendored tooling content and archived change records from
formatting, and SHALL NOT exclude live capability specifications or ordinary project documentation.

#### Scenario: Vendored tooling content is left alone

- **WHEN** formatting runs over files belonging to vendored agent tooling
- **THEN** those files are not rewritten

#### Scenario: Archived change records are left alone

- **WHEN** formatting runs over files belonging to archived, completed change records
- **THEN** those files are not rewritten

#### Scenario: Live capability specifications are formatted

- **WHEN** formatting runs over the current capability specifications
- **THEN** they are subject to the committed style

### Requirement: Consistent committed style

Formatted sources SHALL use statement-ending semicolons, double-quoted JavaScript strings, a 100-column wrap
width, and two-space indentation by default. The vendored component stylesheet SHALL retain four-space
indentation, and the project manifest's key order SHALL be preserved as authored.

#### Scenario: TypeScript source carries the committed style

- **WHEN** a formatted TypeScript or TSX source is inspected
- **THEN** its statements end with semicolons and its JavaScript strings use double quotes

#### Scenario: Component stylesheet retains its own indentation

- **WHEN** the vendored component stylesheet is formatted
- **THEN** its declarations keep four-space indentation and its other content is not reindented

#### Scenario: Manifest key order is preserved

- **WHEN** the project manifest is formatted
- **THEN** its top-level keys remain in their authored order

### Requirement: Local commit hook

The project SHALL provide a versioned pre-commit hook that runs on every local commit, formats the staged
supported files, re-stages the formatted result, and blocks the commit when linting fails or when staged
OpenSpec artifacts fail validation.

#### Scenario: Staged formatting error is corrected automatically

- **WHEN** a commit stages a supported file that deviates from the committed style
- **THEN** the hook formats and re-stages it, and the commit proceeds containing the formatted content

#### Scenario: Staged lint error blocks the commit

- **WHEN** a commit stages a file containing a lint error
- **THEN** the hook exits non-zero and the commit is not created

#### Scenario: Invalid OpenSpec artifacts block the commit

- **WHEN** a commit stages OpenSpec artifacts that fail validation
- **THEN** the hook exits non-zero and the commit is not created

#### Scenario: Clean staged change proceeds

- **WHEN** a commit stages only well-formatted, lint-clean, valid content
- **THEN** the hook exits zero and the commit is created

### Requirement: Local push hook

The project SHALL provide a versioned pre-push hook that runs the canonical quality command and blocks the
push when it fails.

#### Scenario: Full gate failure blocks the push

- **WHEN** a push is attempted while any gate in the canonical command fails
- **THEN** the hook exits non-zero and no refs are pushed

#### Scenario: Green tree pushes

- **WHEN** a push is attempted while every gate passes
- **THEN** the hook exits zero and the push proceeds

### Requirement: Hook installation on a fresh clone

Git hook scripts SHALL be tracked files in the repository rather than existing only in a local hooks
directory, and a fresh clone SHALL enable them through a documented install-time step.

#### Scenario: Fresh clone has active hooks

- **WHEN** a contributor clones the repository and completes the documented install step
- **THEN** the commit and push hooks are active without manual per-clone configuration

#### Scenario: Hooks are versioned

- **WHEN** a contributor inspects the repository contents
- **THEN** the hook scripts are present as tracked files

#### Scenario: Documented bypass and recovery

- **WHEN** a contributor consults the project documentation
- **THEN** it states how to bypass a hook deliberately and how to restore hook operation

### Requirement: Pull-request quality validation

Pull requests and pushes to the main branch SHALL run the canonical quality command in a dedicated workflow
that holds read-only repository permissions and performs no deployment.

#### Scenario: Pull request runs the full gate

- **WHEN** a pull request is opened or updated
- **THEN** the validation workflow runs the canonical quality command against the pull request revision

#### Scenario: Pull request does not deploy

- **WHEN** a pull request is opened or updated
- **THEN** no deployment is attempted and the GitHub Pages site is not replaced

#### Scenario: Failing pull request is reported

- **WHEN** the canonical quality command fails for a pull request revision
- **THEN** the validation check reports a failure

### Requirement: Deployment remains separately gated

The deployment workflow SHALL continue to publish only from the main branch, SHALL run the same canonical
quality command before publishing an artifact, and SHALL NOT be triggered by pull requests.

#### Scenario: Green main push publishes

- **WHEN** a commit is pushed to the main branch and the canonical quality command succeeds
- **THEN** the workflow publishes the resulting production build

#### Scenario: Failing main push does not publish

- **WHEN** a commit is pushed to the main branch and any gate fails
- **THEN** the workflow reports the failure and publishes nothing

#### Scenario: Manual rebuild remains available

- **WHEN** a maintainer starts the deployment workflow manually
- **THEN** the current main revision is rebuilt and published without requiring a new commit

### Requirement: Explicit zero-warning lint baseline

The lint baseline SHALL report zero warnings and zero errors across the repository, and the known
non-applicable exception for vendored UI components SHALL be scoped by committed configuration to that
directory alone rather than applied repository-wide or suppressed inline.

#### Scenario: Baseline is clean

- **WHEN** linting runs over the whole repository
- **THEN** it reports zero warnings and zero errors

#### Scenario: Exception stays narrow

- **WHEN** the same rule is violated in a file outside the vendored UI component directory
- **THEN** linting still reports the violation

#### Scenario: No inline suppression required

- **WHEN** the vendored UI component files are inspected
- **THEN** they carry no tool-specific inline suppression comments for this exception
