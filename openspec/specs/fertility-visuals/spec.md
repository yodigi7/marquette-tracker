# Fertility Visuals Specification

## Purpose

Defines a shared, theme-aware visual language for fertility observations, derived status, forecasts, and inferred-data provenance across the Calendar, Status, Cycle chart, and History/Stats surfaces.

## Requirements

### Requirement: Fertility states use a shared theme-aware visual language

The app SHALL assign a consistent visual treatment to each existing derived day status (`pre-fertile`, `fertile`, `post-peak`, and `post-calendar`) in both light and dark themes. Each treatment SHALL preserve the existing status meaning, remain distinguishable from the base surface, and remain distinguishable from the other derived statuses.

#### Scenario: Status states remain distinct in dark mode

- **WHEN** the user views recorded days representing all four derived day statuses in dark mode
- **THEN** each status has a readable, visually distinguishable treatment
- **AND** the day number remains readable against its treatment

#### Scenario: Light-mode status meaning is preserved

- **WHEN** the user views the same recorded statuses in light mode
- **THEN** the status meanings remain the same as before the visual treatment change
- **AND** no status is reassigned to a different meaning

### Requirement: Visual layers remain distinguishable

The app SHALL visually distinguish raw observations (including monitor readings, menses, intercourse, and inferred-data provenance), derived day status, confirmed or predicted source, future forecast, and predicted ovulation. When multiple cues apply to one item, the app SHALL apply a deterministic visual precedence without hiding raw data or changing interpretation.

#### Scenario: Confirmed and predicted status remain distinguishable

- **WHEN** two days have the same derived status but different confirmed or predicted sources
- **THEN** the user can distinguish their source cues in addition to the status treatment
- **AND** the source distinction does not change either day's status label

#### Scenario: Forecast is not confused with confirmed data

- **WHEN** a future fertile-window forecast is displayed
- **THEN** it uses a predictive visual cue distinct from confirmed data
- **AND** the cue remains identifiable without relying on color alone

#### Scenario: Inferred data remains distinct from user input

- **WHEN** a stored inferred reading is displayed
- **THEN** its provenance cue is visibly distinct from the cue for a user-entered reading
- **AND** the underlying reading value remains visible

### Requirement: Important fertility distinctions meet contrast and non-color requirements

Normal text in the affected fertility surfaces SHALL meet a contrast ratio of at least 4.5:1 against its adjacent background. Meaningful graphical state boundaries, markers, and indicator shapes SHALL meet a contrast ratio of at least 3:1 against adjacent colors. Important distinctions SHALL have a non-color cue or an equivalent textual/legend cue when color alone would not be sufficient.

#### Scenario: Dark-mode text is readable

- **WHEN** a user views Calendar, Status, Cycle chart, or History/Stats in dark mode
- **THEN** day numbers, status text, source labels, forecast labels, and chart labels are readable against their actual adjacent backgrounds

#### Scenario: Status remains understandable without color

- **WHEN** a user cannot distinguish two status colors or has color-vision limitations
- **THEN** borders, line styles, marker shapes, labels, or the applicable legend still communicate the important distinction

### Requirement: Legends describe the active visual vocabulary

Each surface that exposes fertility states SHALL provide a legend or equivalent labels whose colors, line styles, borders, and marker shapes match the items shown on that surface. The legend SHALL include every derived status, source/forecast cue, and raw-data marker that the surface can display.

#### Scenario: Calendar legend covers displayed states

- **WHEN** the Calendar legend is displayed
- **THEN** it explains the four derived statuses, source/forecast cues, and raw markers that can appear in day cells
- **AND** its samples match the corresponding day-cell treatments

### Requirement: Theme changes do not change interpretation

Changing between light and dark themes SHALL NOT change any derived status, source, forecast, provenance marker, or algorithm-enabled state.

#### Scenario: Theme toggle preserves data meaning

- **WHEN** the user switches themes while viewing the same records
- **THEN** the displayed status, source, forecast, and provenance meanings remain identical
- **AND** only their visual presentation changes
