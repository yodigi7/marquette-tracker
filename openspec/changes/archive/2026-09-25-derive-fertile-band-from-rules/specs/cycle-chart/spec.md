# Spec Delta

## ADDED Requirements

### Requirement: Fertile-window reference area uses a single treatment

The Cycle chart SHALL render the fertile-window reference area with one theme-appropriate treatment in both light and dark themes. It SHALL NOT distinguish a confirmed window from a predicted window by outline style or any other source cue. The chart SHALL continue to show an unknown end when the engine reports one.

#### Scenario: One window treatment regardless of evidence

- **WHEN** a cycle's fertile window is displayed
- **THEN** the reference area uses the same treatment as any other cycle's window
- **AND** no outline style, dash pattern, or cue varies by evidence source

#### Scenario: Engine-provided begin and end are unchanged

- **WHEN** the chart renders a fertile-window reference area
- **THEN** it shows the engine-provided begin and end days
- **AND** removing the source distinction does not alter those values

#### Scenario: Unknown window end remains represented

- **WHEN** the engine reports a fertile window with no end day
- **THEN** the chart retains its existing extension or indication behavior for the open end

### Requirement: Cycle chart per-day status covers unrecorded cycle days

The Cycle chart SHALL resolve a derived status for every cycle day in the charted span, whether or not a Day Record exists for that day. A day with no record SHALL NOT be rendered as a gap in the status presentation solely because nothing was logged.

#### Scenario: Unrecorded days inside the window carry a status

- **GIVEN** a cycle with a monitor Peak on day 12 and no records for days 13 through 16
- **WHEN** the chart renders that cycle
- **THEN** days 13 through 16 each carry the `fertile` status
- **AND** they are not left without a status

#### Scenario: The monitor track still shows only real readings

- **WHEN** a cycle day has no Day Record
- **THEN** the monitor band for that day shows the empty track
- **AND** no monitor reading is displayed for it

## MODIFIED Requirements

### Requirement: Cycle chart keeps its existing data representation

The Cycle chart SHALL continue to render one monitor-reading band for each cycle day, one fertile-window reference area when interpretation is available, and the existing optional mucus, BBT, and intercourse overlays. This change SHALL NOT add separate pre-fertile, post-peak, or post-calendar bands to the chart.

#### Scenario: Existing strip structure is preserved

- **WHEN** the user opens a cycle chart
- **THEN** the chart contains the existing monitor-band strip and fertile-window reference area
- **AND** no new per-day derived-status band layer is introduced

#### Scenario: Widening day status does not add a band

- **WHEN** a charted cycle contains days with no Day Record
- **THEN** those days gain a derived status in the chart's data
- **AND** the chart renders no additional per-day band layer for them

## REMOVED Requirements

### Requirement: Fertile-window source is communicated without changing window semantics

**Reason**: The requirement exists to keep the confirmed and predicted window cues — including the solid/dashed outline distinction — distinguishable on the chart. The source axis has been removed from every surface, so there is no confirmed/predicted distinction left to communicate. Window semantics, the unknown-end behavior, and theme-aware rendering are unchanged and are carried forward by the new requirement in this delta.

**Migration**: Remove the `source` field from the chart's window and day models and drop the dash-array selection. The reference area keeps one outline treatment and the same begin, end, and open-end behavior.
