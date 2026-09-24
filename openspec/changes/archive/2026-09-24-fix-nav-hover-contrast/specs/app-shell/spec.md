# Spec Delta

## Purpose

The application shell's top-level navigation renders links that remain readable at rest and on hover in both the light and dark themes that users can select in Settings.

## ADDED Requirements

### Requirement: Navigation links use theme-aware rest and hover colors

The top-level navigation links SHALL render with a resting color that is legible against the page background and a hover color that increases contrast — lighter in dark mode, darker in light mode — so the label text always stays readable.

#### Scenario: Readable hover in dark mode
- **WHEN** the app is in dark mode and a navigation link is hovered
- **THEN** the link text brightens against the dark background instead of darkening, and remains readable

#### Scenario: Readable rest state in dark mode
- **WHEN** the app is in dark mode and a navigation link is not hovered
- **THEN** the link text renders in a muted tone that is legible against the dark background

#### Scenario: Light mode appearance preserved
- **WHEN** the app is in light mode
- **THEN** the navigation links render the same muted rest color and the same darker hover color as before this change

### Requirement: Navigation links keep their labels and destinations

The top-level navigation links SHALL keep their current labels ("Today", "Calendar", "History", "Settings") and route destinations; the fix changes presentation only.

#### Scenario: Links unchanged
- **WHEN** a user clicks a navigation link
- **THEN** the app navigates to the same destination as before the change