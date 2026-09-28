# Spec Delta

## ADDED Requirements

### Requirement: The day-entry temperature field reflects the active unit

The day-entry form SHALL label the basal body temperature field with the active unit, SHALL accept
input at that unit's step, and SHALL show a hint for that unit. Editing an existing record SHALL
pre-populate the field with the stored value converted to the active unit. The form SHALL convert a
typed value to the canonical unit before it is stored, and SHALL clear the temperature when the field
is emptied. Changing the unit preference SHALL NOT alter any stored value.

#### Scenario: The field label and step follow the active unit

- **WHEN** the active unit is Celsius
- **THEN** the field is labelled in Celsius and accepts two-decimal input
- **AND** when the active unit is Fahrenheit the field is labelled in Fahrenheit and accepts one-decimal input

#### Scenario: An existing record opens in the active unit

- **WHEN** the user opens a day whose record holds a stored temperature
- **THEN** the field is pre-populated with that value expressed in the active unit
- **AND** the stored value is not changed by opening the form

#### Scenario: An empty field clears the temperature

- **WHEN** the user clears the temperature field and saves
- **THEN** the day record has no temperature
- **AND** the rest of the entry is saved as usual

#### Scenario: The stored unit does not change with the preference

- **WHEN** the user switches the unit preference and then saves a day
- **THEN** the day is stored in the canonical unit
- **AND** no unit marker is written to the record

### Requirement: An implausible temperature is not saved from the day-entry form

The day-entry form SHALL validate the temperature before saving. A value the app refuses SHALL be
reported to the user with a message naming the reason, SHALL NOT be written, and SHALL leave the
form open and usable with the entered value still in the field so it can be corrected. A value inside
the plausible range but outside the usual range SHALL save only after the user deliberately confirms.
The form SHALL never coerce, clamp, or round a refused value into a storeable one.

#### Scenario: A refused value leaves the form editable

- **WHEN** the user enters a temperature the app refuses and saves
- **THEN** a message explains why, nothing is written, and the form stays open with the value still entered
- **AND** the user can correct the value and save again

#### Scenario: A confirmed unusual value is saved

- **WHEN** the user confirms an unusual-but-plausible temperature
- **THEN** the reading is stored exactly as entered in the active unit
- **AND** the day's other fields are saved alongside it

#### Scenario: Cancelling the confirmation stores nothing

- **WHEN** the user dismisses the unusual-value warning instead of confirming it
- **THEN** no temperature is written for that day
