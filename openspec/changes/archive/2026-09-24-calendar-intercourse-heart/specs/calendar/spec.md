# Spec Delta

## Purpose

The Calendar presents daily tracking observations with clear, consistent visual markers and a matching legend.

## ADDED Requirements

### Requirement: Intercourse heart marker

The Calendar SHALL display a small filled red heart when intercourse is recorded and SHALL use the same marker in the Calendar legend.

#### Scenario: Intercourse recorded on a day
- **WHEN** a Calendar day has intercourse recorded
- **THEN** the day cell displays a small filled red heart
- **AND** the former green dot is not used for intercourse

#### Scenario: Intercourse legend
- **WHEN** the Calendar legend is displayed
- **THEN** the Intercourse entry displays a small filled red heart
- **AND** other legend entries retain their existing markers

#### Scenario: No intercourse recorded
- **WHEN** a Calendar day has no intercourse record
- **THEN** the day cell does not display an intercourse heart
