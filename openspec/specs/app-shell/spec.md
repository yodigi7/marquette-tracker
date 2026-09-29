# App Shell Specification

## Purpose

The application shell's top-level navigation renders links that remain readable at rest and on hover in both the light and dark themes that users can select in Settings.

## Requirements

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

### Requirement: Calendar is the root destination

The app SHALL render the Calendar at `/` and SHALL NOT expose `/calendar` as a separate application route.

#### Scenario: Opening the app root

- **WHEN** the user opens `/`
- **THEN** the Calendar view is rendered

#### Scenario: Legacy Calendar path

- **WHEN** the app receives `/calendar`
- **THEN** `/calendar` is not a separate application destination

### Requirement: Navigation links keep their labels and destinations

The top-level navigation SHALL expose the labels ("Calendar", "Status", "History", "Settings") and logical route destinations (`/` for Calendar, `/status` for Status, `/history` for History, and `/settings` for Settings) across every viewport width and in every presentation form the app renders. When deployed as a static PWA, each logical route SHALL be represented by the corresponding URL fragment without changing the selected view.

#### Scenario: Links unchanged

- **WHEN** a user clicks any top-level navigation link
- **THEN** the app navigates to its associated route (`/`, `/status`, `/history`, or `/settings`) and exposes that route in the URL fragment

#### Scenario: Links unchanged on wide viewports

- **WHEN** a wide-viewport user clicks a top-level navigation link
- **THEN** the app navigates to its associated route and exposes that route in the URL fragment

#### Scenario: Links unchanged on narrow viewports

- **WHEN** a narrow-viewport user chooses a destination from the menu
- **THEN** the app navigates to its associated route and exposes that route in the URL fragment

#### Scenario: New destinations appear on both surfaces

- **WHEN** a new top-level destination is added
- **THEN** it appears in both the wide-viewport bar and the narrow-viewport menu and its fragment route is reachable from either surface

### Requirement: Top-level navigation is reachable on narrow viewports

On narrow viewports the top-level navigation SHALL be reachable through a menu that a user can open and close; opening it SHALL present every top-level destination at full width with a tap target of at least 44px, and closing it SHALL return the user to the content with the menu dismissed.

#### Scenario: Open and close the menu on narrow viewports

- **WHEN** the app is on a narrow viewport and the user activates the menu button
- **THEN** a menu opens listing all top-level navigation destinations, and the user can dismiss it
- **AND** choosing no item leaves the user at their current screen

#### Scenario: All destinations are reachable from the menu

- **WHEN** a narrow-viewport user opens the menu
- **THEN** every top-level navigation destination is listed with its label and opens its route when chosen

### Requirement: Active navigation item is marked

The top-level navigation SHALL visually mark the item that matches the user's current route so they can tell where they are in the app.

#### Scenario: Current route is highlighted

- **WHEN** the user is on a screen that corresponds to a navigation item
- **THEN** that item is rendered with a distinct active style on both narrow and wide viewports
- **AND** the item's label remains visible and readable

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

### Requirement: The application title links to the root destination

The app shell SHALL render the application title as a link to the root route (`/`), which is the
Calendar, on every screen the shell renders and on both viewport surfaces. The title SHALL be
reachable by keyboard and SHALL be exposed to assistive technology as a link. The title SHALL NOT be
marked as the current page, because the primary navigation's Calendar item carries that highlight; at
most one entry in the shell SHALL be marked as the current page at any time. The title SHALL remain a
shortcut to the root route and SHALL NOT be added to the primary navigation's list of destinations.
The title's appearance SHALL NOT change: it SHALL carry no hover, focus, or active styling of its
own, because the title already rests at full contrast and the navigation links' hover treatment
cannot apply to it.

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

#### Scenario: The title's appearance is unchanged

- **WHEN** the application title is rendered, hovered, or keyboard-focused
- **THEN** it renders in exactly its resting appearance, with no hover, focus, or active styling of
  its own
- **AND** the top bar's layout, spacing, and the other navigation items' appearance are unchanged

#### Scenario: Title is never marked as the current page

- **WHEN** the user is on the Calendar
- **THEN** the primary navigation's Calendar item is marked as the current page
- **AND** the application title is not marked as the current page

#### Scenario: Title is not a primary navigation destination

- **WHEN** a user reads the primary navigation on a wide viewport or opens the menu on a narrow
  viewport
- **THEN** the destinations offered are the four top-level destinations and no more
- **AND** the application title is not among them
