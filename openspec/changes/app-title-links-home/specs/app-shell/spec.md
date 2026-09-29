# Spec Delta

## ADDED Requirements

### Requirement: The application title links to the root destination

The app shell SHALL render the application title as a link to the root route (`/`), which is the
Calendar, on every screen the shell renders and on both viewport surfaces. The title SHALL be
reachable by keyboard and SHALL be exposed to assistive technology as a link. The title SHALL carry a
visible hover or focus affordance so that it is distinguishable from a static label. The title SHALL
NOT be marked as the current page, because the primary navigation's Calendar item carries that
highlight; at most one entry in the shell SHALL be marked as the current page at any time. The title
SHALL remain a shortcut to the root route and SHALL NOT be added to the primary navigation's list of
destinations.

#### Scenario: Title is a link on the wide-viewport bar

- **WHEN** a user views the app on a wide viewport
- **THEN** the application title is a link that opens the root route, which renders the Calendar

#### Scenario: Title is a link on the narrow-viewport bar

- **WHEN** a user views the app on a narrow viewport
- **THEN** the application title is a link that opens the root route, which renders the Calendar

#### Scenario: Title returns to the Calendar from another view

- **WHEN** a user is on any view other than the Calendar and activates the application title
- **THEN** the app navigates to the root route, rendering the Calendar
- **AND** the navigation occurs within the app without reloading it, exposing the root route in the
  URL fragment

#### Scenario: Title works from a document view

- **WHEN** a user is on a printable document view and activates the application title
- **THEN** the app navigates to the root route and renders the Calendar

#### Scenario: Title is operable by keyboard

- **WHEN** a user tabs to the application title and activates it
- **THEN** the app navigates to the root route
- **AND** the title is exposed to assistive technology as a link

#### Scenario: Title shows an affordance indicating it is interactive

- **WHEN** the application title is hovered or keyboard-focused
- **THEN** it renders a visible difference from its resting appearance, so that it is
  distinguishable from a static label

#### Scenario: Title is never marked as the current page

- **WHEN** the user is on the Calendar
- **THEN** the primary navigation's Calendar item is marked as the current page
- **AND** the application title is not marked as the current page

#### Scenario: Title is not a primary navigation destination

- **WHEN** a user reads the primary navigation on a wide viewport or opens the menu on a narrow
  viewport
- **THEN** the destinations offered are the four top-level destinations and no more
- **AND** the application title is not among them
