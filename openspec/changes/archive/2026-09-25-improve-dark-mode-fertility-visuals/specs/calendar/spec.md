# Spec Delta

## ADDED Requirements

### Requirement: Calendar day cells use theme-aware derived-status treatments

The Calendar SHALL render each existing derived day status (`pre-fertile`, `fertile`, `post-peak`, and `post-calendar`) with a theme-appropriate treatment in both light and dark modes. Recorded days SHALL remain visually distinguishable from the base calendar background and from one another, while unlogged days SHALL retain the existing blank/base treatment rather than receiving a new derived-status fill.

#### Scenario: Recorded statuses remain distinct in dark mode

- **WHEN** the Calendar displays recorded days in each of the four derived statuses
- **THEN** each status has a readable and distinct treatment
- **AND** the day number remains readable

#### Scenario: Unlogged days remain base cells

- **WHEN** a Calendar day has no Day Record
- **THEN** it does not receive a derived-status fill solely because the date falls inside a calculated window
- **AND** any existing forecast outline remains visibly predictive

#### Scenario: Algorithm-disabled mode hides interpretation styling

- **WHEN** the algorithm is disabled and the Calendar displays raw readings
- **THEN** derived status fills and computed forecast styling are absent
- **AND** raw reading markers remain visible

### Requirement: Calendar distinguishes source, forecast, and provenance cues

The Calendar SHALL keep confirmed versus predicted status source, the future fertile-window forecast, predicted ovulation, raw-data markers, and inferred-data provenance visually distinct. Source and forecast cues SHALL retain deterministic precedence when they overlap, and inferred data SHALL retain both its normal stored reading marker and its assumed-data cue.

#### Scenario: Confirmed and predicted cells remain distinguishable

- **WHEN** recorded days share a status but have different source values
- **THEN** the Calendar presents a source cue that lets the user distinguish them
- **AND** the status meaning remains unchanged

#### Scenario: Forecast cells remain visibly predictive

- **WHEN** a future date falls within the next fertile-window forecast
- **THEN** its treatment uses a predictive border, pattern, label, or equivalent cue
- **AND** it is not presented as a confirmed recorded status

#### Scenario: Assumed readings remain marked

- **WHEN** a Calendar day contains an inferred Day Record
- **THEN** the cell shows the stored reading and an assumed-data marker
- **AND** the marker is not presented as user-entered data

### Requirement: Calendar legend stays synchronized with day cells

The Calendar legend SHALL match the colors, borders, line styles, and marker shapes used by day cells. It SHALL explain all four derived statuses, the confirmed/predicted source cue, the future forecast cue, and each raw marker that the Calendar can display.

#### Scenario: Post-calendar state is explained

- **WHEN** the Calendar legend is displayed
- **THEN** a legend entry describes the `post-calendar` treatment
- **AND** the entry uses the same visual treatment as a `post-calendar` day cell

#### Scenario: Theme-specific legend samples remain synchronized

- **WHEN** the user switches between light and dark themes
- **THEN** legend samples and day-cell treatments change together
- **AND** no legend sample refers to a stale light-only treatment

### Requirement: Calendar remains legible at narrow mobile widths

The Calendar SHALL keep day numbers, status boundaries, forecast cues, and raw-data markers distinguishable at narrow mobile viewport widths without introducing a second interpretation path for Week view or other future calendar layouts.

#### Scenario: Narrow Calendar review

- **WHEN** the user views the Calendar at a narrow mobile width in either theme
- **THEN** the day number and important state cues remain visually separable
- **AND** the most important status/forecast distinctions do not rely on color alone
