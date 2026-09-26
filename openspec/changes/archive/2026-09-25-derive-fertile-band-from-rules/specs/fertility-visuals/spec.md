# Spec Delta

## ADDED Requirements

### Requirement: Visual layers remain distinguishable without source or provenance

The app SHALL visually distinguish raw observations (including monitor readings, menses, and intercourse), derived day status, future forecast, and predicted ovulation in the presentation where each layer is shown. The simple Calendar presentation MAY prioritize the phase, menses stripe, and monitor marker while deferring secondary layers to full detail or day details. Deferring a visual layer SHALL NOT hide or remove the underlying record or change its interpretation. The app SHALL NOT expose a confirmed/predicted status source treatment or an inferred-record provenance treatment, and each derived status SHALL have exactly one treatment.

#### Scenario: Status has a single treatment

- **WHEN** two days have the same derived status
- **THEN** they use the same status treatment
- **AND** no status treatment is varied by an evidence source

#### Scenario: Forecast is not confused with derived data

- **WHEN** a future fertile-window forecast is displayed
- **THEN** it uses a predictive visual cue distinct from the derived status treatments
- **AND** the cue remains identifiable without relying on color alone

#### Scenario: Raw readings remain distinct from derived status

- **WHEN** a stored monitor reading is displayed on a day that also carries a derived status
- **THEN** the reading's marker remains visible over the status treatment
- **AND** the underlying reading value remains legible

#### Scenario: Simple presentation does not remove underlying data

- **WHEN** the simple Calendar presentation defers a secondary visual layer
- **THEN** the corresponding record and value remain available through the day-entry or full-detail surface
- **AND** no stored value or interpretation changes as a result of the display choice

#### Scenario: No source or provenance treatment is defined

- **WHEN** the shared visual vocabulary is inspected
- **THEN** it defines no confirmed/predicted source treatment
- **AND** it defines no inferred-record provenance treatment

## MODIFIED Requirements

### Requirement: Important fertility distinctions meet contrast and non-color requirements

Normal text in the affected fertility surfaces SHALL meet a contrast ratio of at least 4.5:1 against its adjacent background. Meaningful graphical state boundaries, markers, and indicator shapes SHALL meet a contrast ratio of at least 3:1 against adjacent colors. Important distinctions SHALL have a non-color cue or an equivalent textual/legend cue when color alone would not be sufficient. In the simplified Calendar, the color-coded monitor marker SHALL be paired with accessible text or detail information identifying Low, High, or Peak, while the menses stripe provides a non-color cue for its meaning.

#### Scenario: Dark-mode text is readable

- **WHEN** a user views Calendar, Status, Cycle chart, or History/Stats in dark mode
- **THEN** day numbers, status text, forecast labels, and chart labels are readable against their actual adjacent backgrounds

#### Scenario: Status remains understandable without color

- **WHEN** a user cannot distinguish two status colors or has color-vision limitations
- **THEN** borders, line styles, marker shapes, labels, the grouped legend, or accessible text still communicate the important distinction

#### Scenario: Monitor reading has a text equivalent

- **WHEN** a Calendar cell displays a color-coded monitor marker
- **THEN** the exact Low, High, or Peak value is available through accessible text, the summary, or the day-detail surface

### Requirement: Legends describe the active visual vocabulary

Each surface that exposes fertility states SHALL provide a legend or equivalent labels whose colors, line styles, borders, and marker shapes match the items shown in that surface. The Calendar's default legend MAY use a grouped, phase-first vocabulary for the simplified statuses, menses stripe, and monitor readings, while a full-detail legend SHALL explain any additional indicators exposed by that presentation. Status, Cycle chart, and History/Stats surfaces SHALL continue to describe their own active treatments.

#### Scenario: Calendar default legend covers the simple vocabulary

- **WHEN** the Calendar is shown in its default simple presentation
- **THEN** the legend explains `Before`, `Fertile`, `After`, the menses stripe, and monitor readings
- **AND** its samples match the corresponding day-cell treatments

#### Scenario: Calendar legend covers displayed states

- **WHEN** the Calendar legend is displayed
- **THEN** it explains the active Calendar status categories, forecast cues, and raw markers that can appear in the current presentation
- **AND** it contains no status-source or record-provenance entry

#### Scenario: Calendar full-detail legend covers additional layers

- **WHEN** the Calendar exposes full-detail indicators
- **THEN** the legend explains every additional forecast, ovulation, or intercourse cue visible in the day cells

#### Scenario: Other surfaces retain their active legends

- **WHEN** a user views Status, the Cycle chart, or History/Stats
- **THEN** each surface's legend continues to describe the treatments that surface actually displays

## REMOVED Requirements

### Requirement: Visual layers remain distinguishable

**Reason**: The requirement is replaced rather than modified because three of its four scenarios exist only to protect distinctions this change deletes: "Confirmed and predicted status remain distinguishable", "Forecast is not confused with confirmed data", and "Inferred data remains distinct from user input". A MODIFIED block cannot drop them. The requirement's raw-observation, forecast, ovulation, and deferral rules are carried forward by the replacement requirement in this delta.

**Migration**: Remove the shared source cue map, the predicted-fill variants, and the inferred-provenance marker treatment together with their design tokens, so no dormant color remains available to reintroduce either axis.
