# Spec Delta

## ADDED Requirements

### Requirement: Calendar is the root destination

The app SHALL render the Calendar at `/` and SHALL NOT expose `/calendar` as a separate application route.

#### Scenario: Opening the app root
- **WHEN** the user opens `/`
- **THEN** the Calendar view is rendered

#### Scenario: Legacy Calendar path
- **WHEN** the app receives `/calendar`
- **THEN** `/calendar` is not a separate application destination

## MODIFIED Requirements

### Requirement: Navigation links keep their labels and destinations

The top-level navigation SHALL keep the labels ("Calendar", "Status", "History", "Settings") and route destinations (`/`, `/status`, `/history`, `/settings`) across every viewport width and in every presentation form the app renders; this change alters route ownership and presentation.

#### Scenario: Links unchanged
- **WHEN** a user clicks any top-level navigation link
- **THEN** the app navigates to the destination associated with that link (`/`, `/status`, `/history`, or `/settings`)

#### Scenario: Links unchanged on wide viewports
- **WHEN** a wide-viewport user clicks a top-level navigation link
- **THEN** the app navigates to the destination associated with that link

#### Scenario: Links unchanged on narrow viewports
- **WHEN** a narrow-viewport user chooses a destination from the menu
- **THEN** the app navigates to the destination associated with that link

#### Scenario: New destinations appear on both surfaces
- **WHEN** a new top-level destination is added
- **THEN** it appears in both the wide-viewport bar and the narrow-viewport menu
