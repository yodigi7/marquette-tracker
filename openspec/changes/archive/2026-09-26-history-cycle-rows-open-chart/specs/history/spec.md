# Spec Delta

## ADDED Requirements

### Requirement: History cycle rows open the cycle chart

Each cycle row in the History cycle table SHALL be an interactive control that navigates to that cycle's chart at `/cycle/<cycleId>`. The control SHALL be keyboard-focusable and activatable without a pointer, and SHALL carry an accessible name that includes the cycle number and Day 1. The cycle identity cell SHALL be visually identified as the control. Navigation SHALL work for both closed and open cycles, and SHALL continue to work when the algorithm is disabled and derived columns are hidden. The existing cycle-chart route, cycle selector, and empty/fallback behavior for an unknown or deleted cycle id SHALL be preserved.

#### Scenario: Clicking a cycle row opens that cycle's chart

- **WHEN** the user clicks a cycle row in the History table
- **THEN** the app navigates to `/cycle/<cycleId>` for that exact cycle
- **AND** the cycle chart selects and displays the same cycle

#### Scenario: The row is keyboard-focusable and activatable

- **WHEN** the user tabs to a cycle row and presses Enter or Space
- **THEN** the app navigates to that cycle's chart
- **AND** the row is reachable and activatable without a pointer

#### Scenario: The control has an accessible name with cycle context

- **WHEN** a screen reader or assistive technology encounters a cycle row
- **THEN** the row exposes an accessible name that includes the cycle number and Day 1
- **AND** the cycle identity cell is identified as the control

#### Scenario: Closed and open cycles both navigate

- **WHEN** the user activates a closed cycle row or an open cycle row
- **THEN** both navigate to their respective cycle chart

#### Scenario: Navigation works when the algorithm is disabled

- **WHEN** the algorithm is disabled so derived columns are hidden
- **THEN** cycle rows remain navigable and open the cycle chart

#### Scenario: Browser back and forward preserve route behavior

- **WHEN** the user opens a cycle chart from History and then uses browser back
- **THEN** the user returns to History
- **AND** forward navigation returns to the cycle chart

#### Scenario: An unknown or deleted cycle id uses the existing fallback

- **WHEN** the cycle chart receives a cycle id that no longer exists
- **THEN** the cycle chart shows its existing empty/fallback state
