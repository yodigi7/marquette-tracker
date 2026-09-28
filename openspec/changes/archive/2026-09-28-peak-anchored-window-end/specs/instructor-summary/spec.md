# Spec Delta

## MODIFIED Requirements

### Requirement: The summary states the fertile window and the basis of each of its ends

With interpretation enabled, the summary SHALL state the cycle days the computed fertile window begins and
ends on, and SHALL state in plain language for each end whether it was set by the calendar rule or by a
recorded reading. When the protocol cannot determine an end, the summary SHALL say so and SHALL show no
end day.

The summary SHALL name the rule that produced each end, and SHALL NOT distinguish a confirmed window from
a predicted window by outline, dash, shading, legend key, label, or any other source cue. The stated basis
SHALL be the rule and the reading it came from, never a claim that the window is confirmed or predicted.
Where the window ends because of a monitor Peak reading in this cycle, the summary SHALL state that the
window closes three full days after that reading, and SHALL NOT report an end that falls before it.

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
- **THEN** the summary shows no end cycle day
- **AND** it does not name a monitor Peak reading from an earlier cycle as the reason the window ended

#### Scenario: A late Peak is not reported as ending before it

- **GIVEN** a cycle whose monitor Peak is on cycle day 20 and whose earlier cycles hold Peak days no
  later than day 16
- **WHEN** the user opens its summary
- **THEN** the summary states the window ends on cycle day 23
- **AND** it does not report an end earlier than the cycle's own Peak day

#### Scenario: No Peak means no end is stated

- **GIVEN** a cycle with no monitor Peak reading
- **WHEN** the user opens its summary
- **THEN** the summary states that no fertile-window end can be determined
- **AND** it shows no end cycle day
- **AND** it does not name a date from any other cycle as the end

#### Scenario: No confirmed or predicted source cue is printed

- **WHEN** any fertile window is shown on the summary
- **THEN** no confirmed or predicted window label, key, outline, or shading appears
- **AND** the basis of each end is given as the rule and the reading it came from

### Requirement: Protocol warnings the app raised for the cycle appear on the summary

With interpretation enabled, the summary SHALL report every protocol warning the app has raised for that
cycle, each in plain language describing the user's own recorded readings and the window the app computed.
That SHALL include a monitor reading that falls after the computed window end, a cycle with no Peak
reading to set an end from, a cycle whose length falls outside the configured protocol band, a cycle
still in progress past its computed window end, and a run of nine or more consecutive High readings.

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

#### Scenario: A long run of High readings is reported on the document

- **GIVEN** the app raised a warning for nine or more consecutive monitor High readings in this cycle
- **WHEN** the user opens its summary
- **THEN** the summary reports the length of the run of High readings
- **AND** it does not present the run as a Peak reading

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
