# Spec Delta

## MODIFIED Requirements

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
