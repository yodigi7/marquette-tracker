# basal-temperature Specification

## Purpose

Defines how the app stores, validates, and displays basal body temperature: the single unit that is
canonical in storage, the plausibility range a reading must fall within, and what the app does at
each edge of that range. Temperature is a logged overlay and never engine evidence.

## Requirements

### Requirement: Celsius is the canonical storage unit

The system SHALL store every basal body temperature in degrees Celsius regardless of the unit the
user enters or displays. A reading typed in Fahrenheit SHALL be converted to Celsius when it is
saved, and a stored reading SHALL be converted for display only. Celsius is canonical because it is
the finer of the two scales — 0.01 °C against 0.1 °F, which is 0.056 °C — so a value stored in
Celsius is never quantised to a coarser grid than the measurement the user actually took, while a
value stored in Fahrenheit would permanently round every Celsius reading down to 0.056 °C. The
stored record shape SHALL NOT change to express a unit, and no record SHALL be rewritten when the
display preference changes.

#### Scenario: A Fahrenheit entry is stored in Celsius

- **WHEN** the user enters `98.2` while the active unit is Fahrenheit
- **THEN** the stored value is the Celsius equivalent of 98.2 °F
- **AND** no unit is recorded on the day record

#### Scenario: The display preference never rewrites a stored value

- **WHEN** the user changes the temperature unit preference
- **THEN** every stored day record retains its exact previous value
- **AND** the records are re-rendered in the new unit without being written back

#### Scenario: A reading stored before the preference existed renders correctly

- **WHEN** a day record holds a Celsius value and the active unit is Fahrenheit
- **THEN** the entry form and the chart show that value converted to Fahrenheit
- **AND** the stored value is unchanged

### Requirement: A reading outside the usual range is confirmed, not silently stored

The system SHALL treat 35.0 °C to 38.0 °C (95.0 °F to 100.4 °F) as the usual range for a human basal
temperature and save a value inside it without further ceremony. A value outside the usual range but
still inside the plausible human range of 34.0 °C to 42.0 °C (93.2 °F to 107.6 °F) — an illness, a
hot night, travel across time zones — SHALL be saved only after the user is shown a warning naming
the usual range and the value entered, and deliberately confirms. A value outside the plausible
range SHALL be refused. Legitimate outliers exist, so refusal applies only above the plausible range
and never applies to a reading the user has confirmed.

#### Scenario: A usual-range reading saves without interruption

- **WHEN** the user enters a value inside the usual range
- **THEN** the reading is stored and no warning is shown

#### Scenario: An unusual but plausible reading requires deliberate confirmation

- **WHEN** the user enters a value inside the plausible range but outside the usual range
- **THEN** a warning names the usual range and the entered value
- **AND** the value is stored only if the user confirms, and nothing is stored if they do not

#### Scenario: A value outside the plausible range is refused

- **WHEN** the user enters a value below 34.0 °C or above 42.0 °C (below 93.2 °F or above 107.6 °F)
- **THEN** the value is refused and nothing is stored
- **AND** the refusal is not silently coerced, clamped, or rounded into the range

#### Scenario: The range is visible where the reading is entered

- **WHEN** the user opens the day-entry form
- **THEN** the usual range for the active unit is shown alongside the field
- **AND** the hint makes clear that a reading outside it can be saved deliberately

### Requirement: A reading in the wrong unit is refused with the likely cause named

The system SHALL detect a value that is plausible in the unit the user is _not_ using, and SHALL
refuse it with a message naming that other unit and showing the converted value, rather than
presenting it as a generic out-of-range error. The two plausible ranges do not overlap, so this
classification is unambiguous. A refused unit-mismatched value SHALL NOT be stored, and the app SHALL
NOT offer to convert it on the user's behalf.

#### Scenario: A Fahrenheit reading typed into a Celsius field

- **WHEN** the active unit is Celsius and the user enters a value inside the plausible Fahrenheit range
- **THEN** the value is refused with a message naming Fahrenheit and showing the Celsius equivalent
- **AND** nothing is stored

#### Scenario: A Celsius reading typed into a Fahrenheit field

- **WHEN** the active unit is Fahrenheit and the user enters a value inside the plausible Celsius range
- **THEN** the value is refused with a message naming Celsius and showing the Fahrenheit equivalent
- **AND** nothing is stored

#### Scenario: A value that is implausible in both units is refused as out of range

- **WHEN** the user enters a value that falls outside the plausible range of both units
- **THEN** the value is refused as out of range without naming either unit as the likely cause

### Requirement: Temperature converts in both directions for display only

The system SHALL convert a stored Celsius value to the active display unit wherever a temperature is
shown to the user, and SHALL convert a typed value from the active display unit back to Celsius when
it is saved. Displayed values SHALL be rounded to the precision the active unit is read at — two
decimal places for Celsius, one for Fahrenheit — and the displayed value SHALL be the value the user
sees and may re-save.

#### Scenario: Displayed values carry the active unit's precision

- **WHEN** a stored value is shown with Fahrenheit active
- **THEN** it is shown to one decimal place
- **AND** the same value shown with Celsius active is shown to two decimal places

#### Scenario: A Fahrenheit-entered value survives a display round trip

- **WHEN** the user enters `98.2` in Fahrenheit, saves, and reopens the same day
- **THEN** the field shows `98.2` again

#### Scenario: A re-save is bounded by the displayed precision

- **WHEN** the user reopens a day and saves without changing the temperature
- **THEN** the stored value changes by no more than the last displayed digit of the active unit
