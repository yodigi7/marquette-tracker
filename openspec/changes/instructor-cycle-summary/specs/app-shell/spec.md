# Spec Delta

## ADDED Requirements

### Requirement: The shell yields the printed page to a document

The app shell SHALL suppress its top-level navigation, the viewport's default page padding, and any
interactive control that is not part of a document when the page is printed, so that a document route
prints from the top of the page with no app chrome. In every other context the shell SHALL render exactly
as it did before, and a document route SHALL remain reachable and navigable in the app as any other view.

#### Scenario: Navigation is absent from a printout

- **WHEN** the user prints a page
- **THEN** the printout contains no top-level navigation

#### Scenario: A document starts at the top of the printed page

- **WHEN** the user prints a page
- **THEN** the printed content begins at the top of the page rather than below the shell's padding

#### Scenario: The shell is unchanged on screen

- **WHEN** the user navigates the app
- **THEN** the top-level navigation and page padding render as before
- **AND** a document route is reachable and can be navigated back from
