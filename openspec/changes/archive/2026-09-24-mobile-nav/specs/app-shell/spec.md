# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Navigation links keep their labels and destinations

The top-level navigation SHALL keep its labels ("Today", "Calendar", "History", "Settings") and route destinations across every viewport width and in every presentation form the app renders; this change alters presentation only.

#### Scenario: Links unchanged
- **WHEN** a user clicks a navigation link
- **THEN** the app navigates to the same destination as before the change

#### Scenario: Links unchanged on wide viewports
- **WHEN** a wide-viewport user clicks a navigation link
- **THEN** the app navigates to the same destination as before the change

#### Scenario: Links unchanged on narrow viewports
- **WHEN** a narrow-viewport user chooses a destination from the menu
- **THEN** the app navigates to the same destination as before the change

#### Scenario: New destinations appear on both surfaces
- **WHEN** a new top-level destination is added
- **THEN** it appears in both the wide-viewport bar and the narrow-viewport menu