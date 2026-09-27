# Spec Delta

## MODIFIED Requirements

### Requirement: Fertile-window reference area uses a single treatment

The Cycle chart SHALL render the fertile-window reference area with one theme-appropriate treatment in both light and dark themes. It SHALL NOT distinguish a confirmed window from a predicted window by outline style or any other source cue, and its legend SHALL NOT advertise a confirmed window or a predicted window as separate keys. The chart SHALL continue to show an unknown end when the engine reports one.

#### Scenario: One window treatment regardless of evidence

- **WHEN** a cycle's fertile window is displayed
- **THEN** the reference area uses the same treatment as any other cycle's window
- **AND** no outline style, dash pattern, or cue varies by evidence source

#### Scenario: The legend describes what the chart draws

- **WHEN** the user views the Cycle chart
- **THEN** the legend's window key names the single fertile-window treatment the chart draws
- **AND** the legend carries no key for a predicted window or a confirmed window

#### Scenario: Engine-provided begin and end are unchanged

- **WHEN** the chart renders a fertile-window reference area
- **THEN** it shows the engine-provided begin and end days
- **AND** removing the source distinction does not alter those values

#### Scenario: Unknown window end remains represented

- **WHEN** the engine reports a fertile window with no end day
- **THEN** the chart retains its existing extension or indication behavior for the open end
