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
