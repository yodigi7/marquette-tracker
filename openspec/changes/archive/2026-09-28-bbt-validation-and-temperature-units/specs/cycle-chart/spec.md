# Spec Delta

## ADDED Requirements

### Requirement: The temperature axis rescales and is labelled with its unit

The Cycle chart SHALL plot stored basal temperatures converted to the active display unit, and its
temperature axis SHALL scale to the converted values so the overlay stays inside the visible plot
area. The axis SHALL be labelled with the active unit so a plotted value can be read without
consulting another screen. When a cycle holds no temperature readings, the axis SHALL fall back to
the usual range for the active unit rather than to a Celsius-specific default. The axis SHALL derive
its scale from the plotted values, so an implausible stored value from before validation existed
SHALL widen the axis rather than push the line outside the plot.

#### Scenario: A Fahrenheit user sees a Fahrenheit axis

- **WHEN** the active unit is Fahrenheit and the BBT overlay is enabled
- **THEN** the temperature axis is scaled to the Fahrenheit readings and its ticks are labelled in Fahrenheit

#### Scenario: The line stays inside the plot area

- **WHEN** the active unit changes
- **THEN** the temperature line remains within the visible axis range rather than plotting outside it

#### Scenario: An empty cycle still shows a usable axis

- **WHEN** a cycle has no temperature readings and the BBT overlay is enabled
- **THEN** the axis falls back to the usual range expressed in the active unit

#### Scenario: The overlay values follow the active unit

- **WHEN** the user switches the unit preference and reopens the cycle chart
- **THEN** the plotted temperatures are shown in the new unit
- **AND** no stored value is changed
