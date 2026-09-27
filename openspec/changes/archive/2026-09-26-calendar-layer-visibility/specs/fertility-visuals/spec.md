# Spec Delta

## MODIFIED Requirements

### Requirement: Important fertility distinctions meet contrast and non-color requirements

Normal text in the affected fertility surfaces SHALL meet a contrast ratio of at least 4.5:1 against its adjacent background. Meaningful graphical state boundaries, markers, and indicator shapes SHALL meet a contrast ratio of at least 3:1 against adjacent colors. Important distinctions SHALL have a non-color cue or an equivalent textual/legend cue when color alone would not be sufficient. In the simplified Calendar, the color-coded monitor marker SHALL be paired with accessible text or detail information identifying Low, High, or Peak, while the menses stripe provides a non-color cue for its meaning. The same requirement SHALL apply to the distinction between a derived day and a projected day.

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

#### Scenario: Hiding a layer keeps its text equivalent

- **WHEN** a user hides the visual layer for a monitor reading or a derived status
- **THEN** the reading or status is still available through accessible text, the summary, or the day-detail surface
- **AND** the text equivalent the hidden treatment relied on is still present

#### Scenario: Projected days are distinguishable without color

- **WHEN** a Calendar cell displays a projected day that is otherwise indistinguishable by color from a derived day
- **THEN** a non-color cue such as a border, pattern, marker, label, or accessible text communicates that the day is projected
- **AND** the cue is available on every surface that shows projected days

### Requirement: Legends describe the active visual vocabulary

Each surface that exposes fertility states SHALL provide a legend or equivalent labels whose colors, line styles, borders, and marker shapes match the items shown in that surface. The Calendar's default legend MAY use a grouped, phase-first vocabulary for the simplified statuses, menses stripe, and monitor readings, SHALL describe the predictive treatment under a single entry covering both the next-window forecast and projected cycle days, and MAY expose each of its entries as a control that hides and restores that entry's layer. Where an entry is such a control, the entry's hidden state SHALL be distinguishable without relying on colour alone and SHALL be available to assistive technology as a state. No surface SHALL list an ovulation estimate, because the shared vocabulary defines none. Status, Cycle chart, and History/Stats surfaces SHALL continue to describe their own active treatments.

#### Scenario: Calendar default legend covers the simple vocabulary

- **WHEN** the Calendar is shown in its default simple presentation
- **THEN** the legend explains `Before`, `Fertile`, `After`, the menses stripe, and monitor readings
- **AND** its samples match the corresponding day-cell treatments

#### Scenario: Calendar legend covers displayed states

- **WHEN** the Calendar legend is displayed
- **THEN** it explains the active Calendar status categories, forecast cues, projected-day cues, and raw markers that can appear in the current presentation
- **AND** it contains no status-source or record-provenance entry

#### Scenario: Calendar full-detail legend covers additional layers

- **WHEN** the Calendar exposes full-detail indicators
- **THEN** the legend explains every additional forecast or intercourse cue visible in the day cells
- **AND** it lists no ovulation estimate

#### Scenario: A legend entry that hides a layer is still readable

- **WHEN** a legend entry is a visibility control and its layer is hidden
- **THEN** the entry's hidden state is perceivable without relying on colour alone
- **AND** the entry's label remains readable and its state is exposed to assistive technology

#### Scenario: Other surfaces retain their active legends

- **WHEN** a user views Status, the Cycle chart, or History/Stats
- **THEN** each surface's legend continues to describe the treatments that surface actually displays

### Requirement: Visual layers remain distinguishable without source or provenance

The app SHALL visually distinguish raw observations (including monitor readings, menses, and intercourse), derived day status, future forecast, and projected cycle days in the presentation where each layer is shown. A projected cycle day SHALL use the same predictive visual cue as a forecast day, so that a projected day is distinguishable from a derived day by the same means. The simple Calendar presentation MAY prioritize the phase, menses stripe, and monitor marker while deferring secondary layers to full detail or day details. Deferring a visual layer SHALL NOT hide or remove the underlying record or change its interpretation. The app SHALL NOT expose a confirmed/predicted status source treatment or an inferred-record provenance treatment, each derived status SHALL have exactly one treatment, and the app SHALL NOT define a single-day ovulation estimate treatment.

Where a user is given controls that hide visual layers, hiding the predictive cue is a user-initiated opt-out from the projected-versus-derived distinction on the affected surface, and the underlying projection SHALL remain recorded, computed, and available in accessible text. A control that hides a layer SHALL NOT change any stored value, cycle structure, or interpretation.

#### Scenario: Status has a single treatment

- **WHEN** two days have the same derived status
- **THEN** they use the same status treatment
- **AND** no status treatment is varied by an evidence source

#### Scenario: Forecast is not confused with derived data

- **WHEN** a future fertile-window forecast is displayed
- **THEN** it uses a predictive visual cue distinct from the derived status treatments
- **AND** the cue remains identifiable without relying on color alone

#### Scenario: Projected days reuse the forecast cue

- **WHEN** a projected cycle day is displayed
- **THEN** it uses the same predictive visual cue as a forecast day
- **AND** it is distinguishable from a derived day without relying on color alone
- **AND** unless the user has hidden that cue, in which case the day is still reported as projected in accessible text

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

#### Scenario: No ovulation estimate treatment is defined

- **WHEN** the shared visual vocabulary is inspected
- **THEN** it defines no single-day ovulation estimate treatment
- **AND** no surface renders one
