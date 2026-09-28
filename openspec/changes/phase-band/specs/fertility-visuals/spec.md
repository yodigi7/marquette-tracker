# Spec Delta

## MODIFIED Requirements

### Requirement: Fertility states use a shared theme-aware visual language

The app SHALL assign a consistent visual treatment to each existing derived day status (`pre-fertile`, `fertile`, `post-peak`, and `post-calendar`) in both light and dark themes. Each treatment SHALL preserve the existing status meaning and remain distinguishable from the base surface. Surfaces that display the precise status SHALL keep all four statuses distinguishable from each other. The Calendar's default presentation MAY render the collapsed `Before`/`Fertile`/`After` phase aliases instead, in which case the phase treatments SHALL reuse the existing theme-aware status treatments and the precise status SHALL remain available in the Status view, the full-detail presentation, and accessible text.

Each status treatment SHALL be composed of parts with different obligations. The **fill** is the large background area of a day; it SHALL preserve the phase's hue so the surface is recognisably tinted, and it SHALL keep text and markers legible against it. A status is distinguished from another by a part that is not painted beneath a marker, and there are two of those: a **band**, a thin strip a Calendar day carries along one edge, and a **bar**, a solid fill spanning a whole day. A band or a bar SHALL be mutually distinguishable from the bands and bars of the other statuses shown on the same surface, in every theme.

This split exists because a monitor marker is painted on top of a Calendar day's fill, which caps how light that fill may be. Requiring the fills to carry the distinction as well is not satisfiable within that cap in the dark theme, and a palette that tries is either illegible under the marker or in breach of the marker contrast rules. A band is not painted beneath a marker and so is free of the cap, which is what lets a status be named without touching the fill at all. A bar spans the whole day and _is_ painted beneath the marker, so it is bound by the cap like any fill — which is why it carries its own value rather than the cell's, and why it is as bright as the readings allow and no brighter. The fill's exemption from the separation requirement is therefore a consequence of the marker rules in this capability, not a relaxation of them.

The fertile window SHALL be drawn as a solid bar rather than a band, so that the window is the only filled shape on a Calendar and the statuses either side of it stay quiet. The bar's colour MAY differ from the status's ordinary fill, and in the dark theme it does, because a full-height shape at the cell tint's lightness is not distinguishable from the page; the bar SHALL NOT be lightened beyond what the marker rules allow.

A surface that shows only a fill and no band or bar — a filled badge, for instance — SHALL carry its own distinction and is not covered by the band and bar rules.

#### Scenario: Status states remain distinct in dark mode

- **WHEN** the user views recorded days representing all four derived day statuses in dark mode
- **THEN** each status has a readable, visually distinguishable treatment
- **AND** the day number remains readable against its treatment

#### Scenario: Light-mode status meaning is preserved

- **WHEN** the user views the same recorded statuses in light mode
- **THEN** the status meanings remain the same as before the visual treatment change
- **AND** no status is reassigned to a different meaning

#### Scenario: Calendar phase aliases do not change status meaning

- **WHEN** the default Calendar presentation renders a recorded day
- **THEN** it MAY show the collapsed `Before`, `Fertile`, or `After` phase for the underlying status
- **AND** the precise status is still available in the Status view, the full-detail presentation, and accessible text

#### Scenario: The bands carry the distinction between statuses

- **WHEN** a user scans a Calendar month in either theme
- **THEN** the marks of the statuses present are distinguishable from one another
- **AND** that distinction does not depend on the fills beneath them

#### Scenario: Two tinted fills are not required to be distinguishable from each other

- **WHEN** two statuses' fills are close in colour
- **THEN** that is permitted
- **AND** the user can still tell the statuses apart from their bands and bars

### Requirement: Important fertility distinctions meet contrast and non-color requirements

Normal text in the affected fertility surfaces SHALL meet a contrast ratio of at least 4.5:1 against its adjacent background. Meaningful graphical state boundaries, markers, and indicator shapes SHALL meet a contrast ratio of at least 3:1 against adjacent colors. For a marker painted inside a Calendar day cell, the adjacent colors are every fill that cell can present in the active theme, which are the base surface, each collapsed phase fill, the post-calendar fill, and the forecast fill; meeting the ratio against the base surface alone does not satisfy this requirement. The three monitor readings SHALL additionally be mutually distinguishable from one another at the size the marker is actually drawn, so that a user can tell a Low reading from a Peak reading without consulting the legend. Where that distinction is carried by hue rather than by lightness in a given theme, the theme's palette SHALL still satisfy the 3:1 ratio for every reading.

A status band SHALL meet a contrast ratio of at least 3:1 against the fill it sits on and against the surface behind the element, in every theme in which it is drawn. Because a band is not painted beneath a marker, the cap the marker places on a fill does not apply to it, and a band SHALL NOT be darkened to satisfy a fill's constraints.

A status bar is a large filled area, not a boundary or an indicator shape, and SHALL be held to the fill rules rather than to a contrast ratio against the surface behind it: no fill in either theme reaches 3:1 against its page, and a large area does not need to. A bar SHALL instead be distinguishable from the surfaces and fills it sits beside by colour distance, in every theme.

The fertile window is a single interval, and the Calendar SHALL mark it as one object rather than as a run of interchangeable days: the window's first and last day SHALL each be presented differently from the days between them. The difference SHALL be a property of the bar's shape, and the bar SHALL NOT be accompanied by a separate mark beside it, since a mark in the bar's own colour is not visible and a mark in another colour is read as debris rather than as part of the bar. A window that no user can distinguish between two of its phases by colour alone SHALL remain distinguishable through the bars and bands.

Important distinctions SHALL have a non-color cue or an equivalent textual/legend cue when color alone would not be sufficient. In the simplified Calendar, the color-coded monitor marker SHALL be paired with accessible text or detail information identifying Low, High, or Peak, while the menses stripe provides a non-color cue for its meaning. The same requirement SHALL apply to the distinction between a derived day and a projected day.

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

#### Scenario: Every monitor reading is visible on every Calendar fill

- **WHEN** a monitor marker is painted on a Calendar day cell in either theme
- **THEN** the marker meets a contrast ratio of at least 3:1 against every fill that cell can present
- **AND** this holds for the Low, High, and Peak readings alike

#### Scenario: A Low reading is told apart from a Peak reading

- **WHEN** a user scans a Calendar month containing both a Low and a Peak reading at the size the markers are drawn
- **THEN** the two readings are visually distinguishable from one another without reading the legend

#### Scenario: A status band is visible against its fill and the surface behind it

- **WHEN** a status band is drawn in either theme
- **THEN** it meets a contrast ratio of at least 3:1 against the fill it sits on
- **AND** it meets a contrast ratio of at least 3:1 against the surface behind the element

#### Scenario: The window's bar is legible as its own surface

- **WHEN** the window's bar is drawn in either theme
- **THEN** it is distinguishable from the surface behind the cell and from the fills it sits beside
- **AND** it is not read as either neighbouring phase's band

#### Scenario: The window's bar is not brightened past what a reading survives

- **WHEN** the window's bar is drawn in either theme
- **THEN** it meets the 3:1 marker rule against every reading, as any other Calendar fill does
- **AND** the guard names the reading that binds it, so a later brightening is made against the right one
- **AND** it is not pushed past that limit to make the window more prominent

#### Scenario: The fertile window is marked as one interval

- **WHEN** the Calendar renders a recorded cycle whose window spans more than one day
- **THEN** the window's first day and its last day are presented differently from the days between them
- **AND** a user who cannot distinguish the phase colours can still tell which days are inside the window

#### Scenario: The window's ends are marked by the bar's shape, not by a mark beside it

- **WHEN** the window's first or last day is presented
- **THEN** the difference from an interior day is a property of the bar's shape
- **AND** no additional mark is drawn next to the day in order to indicate the boundary

#### Scenario: Hiding a layer keeps its text equivalent

- **WHEN** a user hides the visual layer for a monitor reading or a derived status
- **THEN** the reading or status is still available through accessible text, the summary, or the day-detail surface
- **AND** the text equivalent the hidden treatment relied on is still present

#### Scenario: Projected days are distinguishable without color

- **WHEN** a Calendar cell displays a projected day that is otherwise indistinguishable by color from a derived day
- **THEN** a non-color cue such as a border, pattern, marker, label, or accessible text communicates that the day is projected
- **AND** the cue is available on every surface that shows projected days

### Requirement: Monitor reading palette is guarded against drift

The colors assigned to the Low, High, and Peak monitor readings SHALL be verified against the contrast and distinguishability rules of this capability rather than chosen by eye, and the verification SHALL be repeatable so that a later edit to the palette cannot silently reintroduce a non-compliant value. A surface that encodes a monitor reading without consuming the shared monitor palette is unaffected by this requirement.

The same guard SHALL cover the status bands and the window's bar, asserting each band's contrast against its own fill and against the surface behind the element, the bar's distinguishability from the surfaces and fills around it, and their mutual distinguishability, per theme. The bar is included in the surfaces a reading marker is checked against, because a reading on a window day sits on the bar. The guard SHALL read the values it checks from the stylesheet that the app actually loads, so that it cannot assert compliance for a palette that is no longer in use.

The guard SHALL NOT assert that status fills are mutually distinguishable, and SHALL record why: a monitor marker is painted on a Calendar day's fill, which caps the fill's lightness, and no set of fill values inside that cap separates far enough for the assertion to be worth making. A fill assertion written against that cap would either fail against a correct palette or force an illegible one, which is why the separation rule belongs to the bands and the window's bar and not to the fills.

#### Scenario: Palette compliance is asserted, not assumed

- **WHEN** the monitor palette is evaluated
- **THEN** each reading's contrast against every Calendar fill is computed and asserted per theme
- **AND** a value that falls below the required ratio fails the check rather than passing unnoticed

#### Scenario: Band and bar compliance is asserted from the live stylesheet

- **WHEN** the guard evaluates the status bands and the window's bar
- **THEN** it reads their values from the stylesheet the app loads
- **AND** it asserts each against its own fill, against the surface behind it, and against the other marks in the same theme

#### Scenario: A drifted stylesheet fails the guard

- **WHEN** a palette value is edited so that a band, the window's bar, or a monitor reading stops meeting its ratio
- **THEN** the guard fails
- **AND** it does not pass because the check reads a stale copy of the palette

#### Scenario: No fill-separation rule is asserted

- **WHEN** the guard is reviewed
- **THEN** it contains no assertion requiring status fills to be mutually distinguishable
- **AND** it states that the band and the bar carry that distinction instead

#### Scenario: A surface with its own reading encoding is not constrained by the shared palette

- **WHEN** a surface distinguishes monitor readings by a non-color channel such as mark size or height
- **THEN** it is not required to consume the shared monitor palette
- **AND** its readings remain distinguishable on their own terms
