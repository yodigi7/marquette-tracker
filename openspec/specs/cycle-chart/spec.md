# Cycle Chart Specification

## Purpose

Defines the theme-aware presentation of the existing cycle strip chart, including raw monitor bands, the fertile-window reference area, its source cues, and optional observation overlays.

## Requirements

### Requirement: Cycle chart keeps its existing data representation

The Cycle chart SHALL continue to render one monitor-reading band for each cycle day, one fertile-window reference area when interpretation is available, and the existing optional mucus, BBT, and intercourse overlays. This change SHALL NOT add separate pre-fertile, post-peak, or post-calendar bands to the chart.

#### Scenario: Existing strip structure is preserved

- **WHEN** the user opens a cycle chart
- **THEN** the chart contains the existing monitor-band strip and fertile-window reference area
- **AND** no new per-day derived-status band layer is introduced

### Requirement: Monitor bands and overlays are theme-aware and readable

The Cycle chart SHALL render the empty track, Low, High, and Peak monitor bands, plus visible optional overlay markers, with theme-appropriate contrast in both light and dark modes. The chart SHALL preserve the existing meaning of each monitor and overlay value.

#### Scenario: Monitor bands remain distinct in dark mode

- **WHEN** a cycle contains empty, Low, High, and Peak monitor states
- **THEN** each band is distinguishable from the plot background and from the other monitor states
- **AND** the chart legend uses matching visual treatments

#### Scenario: Overlay markers remain visible

- **WHEN** mucus, BBT, or intercourse overlays are enabled
- **THEN** their markers and legend samples remain readable in both themes
- **AND** their underlying data values are unchanged

### Requirement: Fertile-window source is communicated without changing window semantics

The Cycle chart SHALL render the fertile-window reference area with a theme-appropriate treatment in both themes. Confirmed and predicted windows SHALL retain distinct source cues, including the existing solid/dashed distinction or an equivalent accessible equivalent. The chart SHALL continue to show an unknown end when the engine reports one.

#### Scenario: Confirmed window remains distinguishable

- **WHEN** a cycle's fertile window is classified as confirmed
- **THEN** the reference area uses the confirmed visual cue
- **AND** the chart still shows the engine-provided begin and end days

#### Scenario: Predicted window remains predictive

- **WHEN** a cycle's fertile window is classified as predicted
- **THEN** the reference area uses a visually predictive cue
- **AND** it is not confused with a confirmed window

#### Scenario: Unknown window end remains represented

- **WHEN** the engine reports a fertile window with no end day
- **THEN** the chart retains its existing extension/indication behavior
- **AND** the source cue remains readable

### Requirement: Algorithm-disabled chart remains raw-data only

When interpretation is disabled, the Cycle chart SHALL hide the computed fertile-window reference area while continuing to display stored monitor bands and enabled raw-data overlays that do not constitute interpretation.

#### Scenario: Window disappears when interpretation is disabled

- **WHEN** the user disables the algorithm with a cycle chart open
- **THEN** no computed fertile-window reference area is rendered
- **AND** the chart remains usable for stored monitor data
