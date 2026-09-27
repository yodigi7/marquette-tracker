# Spec Delta

## MODIFIED Requirements

### Requirement: Important fertility distinctions meet contrast and non-color requirements

Normal text in the affected fertility surfaces SHALL meet a contrast ratio of at least 4.5:1 against its adjacent background. Meaningful graphical state boundaries, markers, and indicator shapes SHALL meet a contrast ratio of at least 3:1 against adjacent colors. For a marker painted inside a Calendar day cell, the adjacent colors are every fill that cell can present in the active theme, which are the base surface, each collapsed phase fill, the post-calendar fill, and the forecast fill; meeting the ratio against the base surface alone does not satisfy this requirement. The three monitor readings SHALL additionally be mutually distinguishable from one another at the size the marker is actually drawn, so that a user can tell a Low reading from a Peak reading without consulting the legend. Where that distinction is carried by hue rather than by lightness in a given theme, the theme's palette SHALL still satisfy the 3:1 ratio for every reading.

Important distinctions SHALL have a non-color cue or an equivalent textual/legend cue when color alone would not be sufficient. In the simplified Calendar, the color-coded monitor marker SHALL be paired with accessible text or detail information identifying Low, High, or Peak, while the menses stripe provides a non-color cue for its meaning. The same requirement SHALL apply to the distinction between a derived day and a projected day.

Where a user hides a visual layer, the equivalent text or detail information for that layer SHALL remain available. Suppressing a graphical treatment SHALL NOT remove the textual equivalent that the treatment depended on.

#### Scenario: Dark-mode text is readable

- **WHEN** a user views Calendar, Status, Cycle chart, or History/Stats in dark mode
- **THEN** day numbers, status text, forecast labels, and chart labels are readable against their actual adjacent backgrounds

#### Scenario: Status remains understandable without color

- **WHEN** a user cannot distinguish two status colors or has color-vision limitations
- **THEN** borders, line styles, marker shapes, labels, the grouped legend, or accessible text still communicate the important distinction

#### Scenario: Monitor reading has a text equivalent

- **WHEN** a Calendar cell displays a color-coded monitor marker
- **THEN** the exact Low, High, or Peak value is available through accessible text, the summary, or the day-detail surface

#### Scenario: Every monitor reading is visible on every Calendar fill

- **WHEN** a monitor marker is painted on a Calendar day cell in either theme
- **THEN** the marker meets a contrast ratio of at least 3:1 against every fill that cell can present
- **AND** this holds for the Low, High, and Peak readings alike

#### Scenario: A Low reading is told apart from a Peak reading

- **WHEN** a user scans a Calendar month containing both a Low and a Peak reading at the size the markers are drawn
- **THEN** the two readings are visually distinguishable from one another without reading the legend

#### Scenario: Hiding a layer keeps its text equivalent

- **WHEN** a user hides the visual layer for a monitor reading or a derived status
- **THEN** the reading or status is still available through accessible text, the summary, or the day-detail surface
- **AND** the text equivalent the hidden treatment relied on is still present

#### Scenario: Projected days are distinguishable without color

- **WHEN** a Calendar cell displays a projected day that is otherwise indistinguishable by color from a derived day
- **THEN** a non-color cue such as a border, pattern, marker, label, or accessible text communicates that the day is projected
- **AND** the cue is available on every surface that shows projected days

## ADDED Requirements

### Requirement: Monitor reading palette is guarded against drift

The colors assigned to the Low, High, and Peak monitor readings SHALL be verified against the
contrast and distinguishability rules of this capability rather than chosen by eye, and the
verification SHALL be repeatable so that a later edit to the palette cannot silently reintroduce a
non-compliant value. A surface that encodes a monitor reading without consuming the shared monitor
palette is unaffected by this requirement.

#### Scenario: Palette compliance is asserted, not assumed

- **WHEN** the monitor palette is evaluated
- **THEN** each reading's contrast against every Calendar fill is computed and asserted per theme
- **AND** a value that falls below the required ratio fails the check rather than passing unnoticed

#### Scenario: A surface with its own reading encoding is not constrained by the shared palette

- **WHEN** a surface distinguishes monitor readings by a non-color channel such as mark size or height
- **THEN** it is not required to consume the shared monitor palette
- **AND** its readings remain distinguishable on their own terms
