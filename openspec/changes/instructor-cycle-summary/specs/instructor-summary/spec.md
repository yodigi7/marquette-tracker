# Spec Delta

## Purpose

Lets a user produce a single-cycle summary that another person — a Marquette-certified instructor — can
read at a glance, and hand over as a snapshot of what was recorded and what the app derived from it.

## ADDED Requirements

### Requirement: A user can produce a summary for any single cycle, open or closed

The app SHALL provide a summary document for exactly one cycle at a route keyed by that cycle, reachable
from the Cycle chart, and SHALL render it for a cycle that is still in progress as readily as for one that
has closed. It SHALL cover one cycle only. A request for a cycle that does not exist SHALL render an empty
state that offers a route back to the Calendar, and SHALL NOT render a partially filled document.

#### Scenario: A summary is reached from the Cycle chart for a closed cycle

- **WHEN** the user opens the Cycle chart for a closed cycle and follows the link to its summary
- **THEN** the app renders that cycle's summary document
- **AND** it names that cycle and no other cycle

#### Scenario: A summary is available for a cycle still in progress

- **WHEN** the user follows the link to the summary of a cycle that has not closed
- **THEN** the app renders the same document
- **AND** the cycle is presented as in progress

#### Scenario: An unknown cycle renders an empty state

- **WHEN** the summary is opened for a cycle that does not exist
- **THEN** the app renders an empty state
- **AND** it offers a link to the Calendar
- **AND** it renders no cycle values

### Requirement: The summary states the cycle's identity, its day range, its length, and its Peak reading

The summary SHALL state the cycle number, the date of Day 1, the range of cycle days the cycle covers, and
its length. A cycle that has closed SHALL state that length as a number of days. A cycle still in progress
SHALL be labelled as in progress, SHALL state the cycle day reached, and SHALL state that its length is
not yet known rather than showing a number in its place.

When the cycle holds a monitor Peak reading the summary SHALL state the Peak's cycle day and how many
monitor Peak readings the cycle holds, so it never implies a cycle can hold only one. When it holds none,
the summary SHALL say so and SHALL show no Peak day.

#### Scenario: A closed cycle states its length

- **GIVEN** a closed cycle that ran 28 days
- **WHEN** the user opens its summary
- **THEN** the summary states the cycle number and the date of Day 1
- **AND** it states the cycle-day range and a length of 28 days

#### Scenario: An open cycle is not presented as settled

- **GIVEN** a cycle that has not closed and has reached cycle day 17
- **WHEN** the user opens its summary
- **THEN** the summary labels the cycle in progress
- **AND** it states that the length is not yet known
- **AND** it shows no length number in the length position

#### Scenario: Several Peak readings are all reported

- **GIVEN** a cycle with monitor Peak readings on cycle days 12 and 15
- **WHEN** the user opens its summary
- **THEN** the summary states cycle day 15 as the Peak day
- **AND** it states that this is the last of 2 monitor Peak readings in the cycle

#### Scenario: A cycle with no Peak reading says so

- **GIVEN** a cycle with no monitor Peak reading
- **WHEN** the user opens its summary
- **THEN** the summary states that no monitor Peak reading is recorded in this cycle
- **AND** it shows no Peak day

### Requirement: The summary states the fertile window and the basis of each of its ends

With interpretation enabled, the summary SHALL state the cycle days the computed fertile window begins and
ends on, and SHALL state in plain language for each end whether it was set by the calendar rule or by a
recorded reading. When the protocol cannot determine an end, the summary SHALL say so and SHALL show no
end day.

The summary SHALL name the rule that produced each end, and SHALL NOT distinguish a confirmed window from
a predicted window by outline, dash, shading, legend key, label, or any other source cue. The stated basis
SHALL be the rule and the reading it came from, never a claim that the window is confirmed or predicted.

#### Scenario: The window is stated with the basis of both ends

- **GIVEN** a cycle with a first High reading on cycle day 6 and a monitor Peak on cycle day 12
- **WHEN** the user opens its summary
- **THEN** the summary states the fertile window as running from cycle day 6 to cycle day 15
- **AND** it states that the window opened on a recorded reading
- **AND** it states that it closed three full days after a recorded Peak reading
- **AND** it names the rule behind each of those statements

#### Scenario: A window opened by the calendar rule says so

- **GIVEN** a cycle whose window opened on cycle day 6 with no earlier High or Peak reading
- **WHEN** the user opens its summary
- **THEN** the summary states the calendar rule as the basis for the window's start
- **AND** it does not claim a reading set the start day

#### Scenario: A window ending from earlier cycles' Peaks says so

- **GIVEN** a cycle with no monitor Peak reading that is not in its first six cycles
- **WHEN** the user opens its summary
- **THEN** the summary states that the window's end came from monitor Peak readings recorded in earlier
  cycles
- **AND** it shows no Peak day for this cycle

#### Scenario: No Peak means no end is stated

- **GIVEN** a cycle with no monitor Peak reading and no Peak history to fall back on
- **WHEN** the user opens its summary
- **THEN** the summary states that no fertile-window end can be determined
- **AND** it shows no end cycle day

#### Scenario: No confirmed or predicted source cue is printed

- **WHEN** any fertile window is shown on the summary
- **THEN** no confirmed or predicted window label, key, outline, or shading appears
- **AND** the basis of each end is given as the rule and the reading it came from

### Requirement: The per-day table names each monitor reading and adds logged context only where it exists

The summary SHALL carry one row per cycle day of the cycle, whether or not a Day Record exists for that
day. Each row SHALL name the day's monitor reading in words, or state that no reading was logged, and
SHALL show the day's date.

A day holding nothing SHALL show the absence rather than a value. Optional columns for menses, cervical
mucus, temperature, intercourse, pregnancy test, symptoms, and notes SHALL each appear only when at least
one day of the cycle holds that value, so a cycle with little logged stays narrow. No value shown SHALL be
derived, averaged, or carried over from another day.

#### Scenario: A cycle with only monitor readings stays narrow

- **GIVEN** a cycle whose only logged values are Day 1 menses and monitor readings
- **WHEN** the user opens its summary
- **THEN** the per-day table carries the day, its date, and its monitor reading
- **AND** it shows no mucus, temperature, intercourse, pregnancy-test, symptoms, or notes column

#### Scenario: Logged context adds a column when it is present

- **GIVEN** a cycle that records mucus, a temperature, intercourse on one day, and a pregnancy test
- **WHEN** the user opens its summary
- **THEN** the per-day table carries a column for each of mucus, temperature, intercourse, and pregnancy
  test
- **AND** days with nothing logged in those fields show an absence, not a value

#### Scenario: A day with no record shows no reading

- **WHEN** a cycle day holds no Day Record
- **THEN** its row shows that no monitor reading was logged
- **AND** it shows no reading value for it

#### Scenario: Per-day notes are shown where they exist

- **GIVEN** a cycle day carrying a note
- **WHEN** the user opens its summary
- **THEN** that day's row shows the note
- **AND** the notes column appears on the table

### Requirement: Protocol warnings the app raised for the cycle appear on the summary

With interpretation enabled, the summary SHALL report every protocol warning the app has raised for that
cycle, each in plain language describing the user's own recorded readings and the window the app computed.
That SHALL include a monitor reading that falls after the computed window end, a cycle with no Peak
reading to set an end from, a cycle whose length falls outside the configured protocol band, and a cycle
still in progress past its computed window end.

The summary SHALL report the warnings the app has actually raised, and SHALL NOT raise, imply, or
reinterpret a warning of its own. A cycle with no raised warnings SHALL show no warnings section.

#### Scenario: A reading after the computed end is reported on the document

- **GIVEN** a cycle whose monitor shows High or Peak on a cycle day after the computed window end
- **WHEN** the user opens its summary
- **THEN** the summary states that a monitor reading falls outside the computed window
- **AND** it names the cycle day of that reading
- **AND** it states that the window was not changed

#### Scenario: A cycle with no Peak reports the missing end

- **GIVEN** a cycle the app flagged because it has no monitor Peak reading to set an end from
- **WHEN** the user opens its summary
- **THEN** the summary reports that there is no Peak reading and therefore no end for the window

#### Scenario: An out-of-band length is reported on the document

- **GIVEN** the app raised an out-of-band warning for this cycle
- **WHEN** the user opens its summary
- **THEN** the summary states the cycle's length
- **AND** it states that the length falls outside the protocol band the app is configured for

#### Scenario: A cycle past its window end while still in progress is reported

- **GIVEN** a cycle that has not closed and whose computed window end precedes the current day
- **WHEN** the user opens its summary
- **THEN** the summary states that the cycle is still in progress
- **AND** it states the cycle day the computed window ended on

#### Scenario: A cycle with no raised warnings shows no warnings section

- **GIVEN** a cycle the app has raised no protocol warning for
- **WHEN** the user opens its summary
- **THEN** the summary shows no warnings section

### Requirement: With interpretation disabled the summary is a raw log, not a refusal

When the algorithm is disabled, the summary SHALL still be produced and SHALL carry the cycle's identity,
its cycle-day range, its length or in-progress state, and the full per-day log of recorded values. It
SHALL NOT show the fertile window, the window's basis, the Peak day, or any protocol warning, and it SHALL
state that interpretation is off and why those parts are absent.

#### Scenario: Interpretation off still produces the log

- **GIVEN** a cycle with monitor readings and the algorithm disabled
- **WHEN** the user opens its summary
- **THEN** the summary shows the cycle's identity, its day range, and its per-day log of readings
- **AND** it states that interpretation is off

#### Scenario: Interpretation off hides every derived value

- **GIVEN** a cycle with a monitor Peak reading and the algorithm disabled
- **WHEN** the user opens its summary
- **THEN** the summary shows no fertile window and no window basis
- **AND** it shows no Peak day and no protocol warnings
- **AND** it shows the monitor Peak reading in the per-day log, because that reading was logged

### Requirement: The summary is a labelled snapshot that excludes predictions and projected cycles

The summary SHALL state the date it was generated and SHALL state that it is a snapshot. It SHALL NOT show
the app's forecast — no expected next period start, no estimated next fertile window, and no expected
Peak-day range — and SHALL NOT show any projected or future cycle. It SHALL state that predictions and
projected cycles are not included, so their absence is accounted for rather than ambiguous. Turning the
future-cycle projection on SHALL make no difference to the document.

#### Scenario: The document states when it was generated

- **WHEN** the user opens any cycle's summary
- **THEN** the document states the date it was generated
- **AND** it states that it is a snapshot

#### Scenario: No predicted or projected value appears

- **GIVEN** the app has a forecast and the user has several closed cycles
- **WHEN** the user opens a cycle's summary
- **THEN** no expected period start, estimated fertile window, or expected Peak-day range appears
- **AND** the document states that predictions and projected cycles are not included

#### Scenario: The projection setting does not change the document

- **GIVEN** the future-cycle projection is enabled
- **WHEN** the user opens a cycle's summary
- **THEN** the document is the same one shown with the projection disabled
- **AND** no projected cycle day appears in it

### Requirement: The summary is legible on screen in either theme and on a black-and-white printout

The summary SHALL be readable in the light theme and in the dark theme. When printed, it SHALL render in
dark text on a light background regardless of the theme in use, and SHALL remain readable with colour
removed, so no value is distinguished by colour alone. The app's navigation and the controls for the
document SHALL NOT appear in the printout, and the document SHALL start at the top of the printed page.

#### Scenario: The document is readable in the dark theme

- **WHEN** the app is in dark mode and the user opens a summary
- **THEN** every value on the document is readable against the document's background

#### Scenario: Printing from a dark-theme session is still readable

- **WHEN** the app is in dark mode and the user prints the summary
- **THEN** the document prints in dark text on a light background

#### Scenario: The document survives losing colour

- **WHEN** the summary is printed or photocopied in black and white
- **THEN** every monitor reading is still identifiable from the words used for it
- **AND** the window and every value on the document remain identifiable

#### Scenario: App chrome is absent from the printout

- **WHEN** the user prints the summary
- **THEN** the printout contains no navigation, no cycle selector, and no print control
- **AND** the document begins at the top of the page

### Requirement: The summary is handed over by printing, and changes nothing that is stored

Producing a summary SHALL render the document inside the app and hand it over through the user's own
browser print or save action. The app SHALL NOT generate a PDF, PNG, CSV, or other export file, and SHALL
NOT upload, share, or transmit the document. Opening or printing a summary SHALL NOT write, change, or
delete any cycle, day record, or setting, and SHALL leave the JSON backup format and its export unchanged.

#### Scenario: The user prints from the browser

- **WHEN** the user opens a summary and uses the document's print action
- **THEN** the app hands the document to the user's browser to print or save
- **AND** the app produces no export file of its own

#### Scenario: Nothing is stored by reading a summary

- **WHEN** the user opens a cycle's summary
- **THEN** no cycle, day record, or setting is written, changed, or deleted

#### Scenario: The JSON backup is untouched

- **WHEN** the user exports a JSON backup from Settings
- **THEN** the exported document is the versioned JSON backup it was before this change
- **AND** the backup contains no summary content
