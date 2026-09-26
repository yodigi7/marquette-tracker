# Spec Delta

## ADDED Requirements

### Requirement: Status labels use the Calendar phase vocabulary and assert no safety

The Status view SHALL label a derived status with the same phase vocabulary the Calendar uses for
that status: `Before` for `pre-fertile`, `Fertile` for `fertile`, and `After` for both `post-peak`
and `post-calendar`. The two post-window statuses SHALL remain individually identifiable, so a
reader can tell a window closed by a monitor Peak from one closed by the calendar rule. No status
label SHALL assert that a date is safe, infertile, or unlikely to conceive, because a day status is
derived from the computed window and the cycle day alone and does not consider the observations
recorded on that date.

#### Scenario: Phase vocabulary matches the Calendar

- **WHEN** the Status view shows a label for a derived status
- **THEN** the label names the same phase the Calendar uses for that status
- **AND** the precise internal status remains identifiable from the label or its accompanying
  explanation

#### Scenario: No label asserts safety

- **WHEN** the user opens Status for a date whose derived status is `post-peak` or `post-calendar`
- **THEN** the label uses the `After` phase vocabulary
- **AND** it makes no claim that the date is safe, infertile, or unlikely to conceive

#### Scenario: The two post-window statuses remain distinguishable

- **GIVEN** one date whose status is `post-peak` and another whose status is `post-calendar`
- **WHEN** the user views each in Status
- **THEN** the two labels differ from each other
- **AND** each identifies the rule that produced its window end

#### Scenario: A recorded reading does not license a safety claim

- **GIVEN** a date carrying a user-entered monitor reading whose derived status is post-window
- **WHEN** the user opens Status for that date
- **THEN** the label asserts no infertility or safety claim
- **AND** no medical disclaimer is added in place of that claim

## MODIFIED Requirements

### Requirement: Status summaries are readable in both themes

The Status view SHALL render each status label, the fertile-window explanation, and any
next-period estimate with theme-appropriate colors and text contrast. The view SHALL not introduce a
new status category, and the label wording it uses SHALL be the wording specified for the phase
vocabulary requirement.

#### Scenario: Status badge is readable in dark mode

- **WHEN** the user opens Status for a date with a derived status in dark mode
- **THEN** the status badge and its text are readable against the card background
- **AND** the badge's color or cue matches the corresponding Calendar treatment

#### Scenario: Explanation text remains readable

- **WHEN** the Status view shows a fertile-window explanation or next-period estimate
- **THEN** the text remains readable in both light and dark themes
- **AND** no information is conveyed only by a light-only text color
