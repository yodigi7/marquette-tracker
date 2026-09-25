# Spec Delta

## ADDED Requirements

### Requirement: Status summaries are readable in both themes

The Status view SHALL render each existing status label, its source indicator, the fertile-window explanation, and any next-period estimate with theme-appropriate colors and text contrast. The view SHALL preserve the existing status labels and SHALL not introduce a new status category.

#### Scenario: Status badge is readable in dark mode

- **WHEN** the user opens Status for a date with a derived status in dark mode
- **THEN** the status badge and its text are readable against the card background
- **AND** the badge's color or cue matches the corresponding Calendar treatment

#### Scenario: Explanation text remains readable

- **WHEN** the Status view shows a fertile-window explanation or next-period estimate
- **THEN** the text remains readable in both light and dark themes
- **AND** no information is conveyed only by a light-only text color

### Requirement: Status preserves source and predictive meaning

The Status view SHALL visually distinguish confirmed from predicted status source and SHALL make the next-period estimate visibly predictive rather than presenting it as confirmed data. These cues SHALL use the shared fertility visual language and SHALL retain the existing source and forecast semantics.

#### Scenario: Confirmed and predicted source are distinguishable

- **WHEN** the selected date has a confirmed or predicted status source
- **THEN** the source badge or cue is readable and distinct
- **AND** the status label and explanation remain unchanged

#### Scenario: Estimated period is visibly predictive

- **WHEN** a next-period estimate is available
- **THEN** its predictive nature is communicated by a label, cue, or styling
- **AND** it cannot be confused with a confirmed period record

#### Scenario: Algorithm-disabled Status remains logging-only

- **WHEN** the algorithm is disabled
- **THEN** Status shows its logging-only explanation
- **AND** it does not show a computed status badge, source, or fertile-window interpretation
