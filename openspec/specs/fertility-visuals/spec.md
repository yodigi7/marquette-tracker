# Fertility Visuals Specification

## Purpose

Defines a shared, theme-aware visual language for fertility observations, derived status, and forecasts across the Calendar, Status, Cycle chart, and History/Stats surfaces.

## Requirements

### Requirement: Fertility states use a shared theme-aware visual language

The app SHALL assign a consistent visual treatment to each existing derived day status (`pre-fertile`, `fertile`, `post-peak`, and `post-calendar`) in both light and dark themes. Each treatment SHALL preserve the existing status meaning and remain distinguishable from the base surface. Surfaces that display the precise status SHALL keep all four statuses distinguishable from each other. The Calendar's default presentation MAY render the collapsed `Before`/`Fertile`/`After` phase aliases instead, in which case the phase treatments SHALL reuse the existing theme-aware status treatments and the precise status SHALL remain available in the Status view, the full-detail presentation, and accessible text.

Each status treatment SHALL be composed of a **fill**, the large background area of a day. The fill SHALL
preserve the phase's hue so the surface is recognisably tinted, and it SHALL keep text and markers legible
against it.

A monitor marker is painted on top of a Calendar day's fill, which bounds how light that fill may be, and
the bound is set by the **darkest** of the three readings in the active theme. In the dark theme that was
the `Low` reading, and while it was `#0d9488` it permitted a fill of `0.0435` relative luminance — a bound
so tight that the three fills sat within `0.017` OKLab lightness of one another and no search inside it
found a trio worth having. The bound is a property of the marker and the fill **together**, not of the
fill alone, so it moves when the marker moves: at the dark theme's current `Low` reading of `#04ab96` a
fill may reach `1.0406`, and no fill is anywhere near it.

The requirement is that the fills be **legible and distinguishable**, not that they be tinted a particular
amount. A fill that is legible against every reading painted on it and clear of the surface behind the
cell satisfies this requirement regardless of how much headroom the readings leave unused, and a palette
that treats an unused headroom as a defect will ship near-black days to avoid a rule that is not there.

The fertile window is not a fill. It SHALL be drawn as a solid bar spanning the whole day, so that the
window is the only filled shape on a Calendar and the statuses either side of it stay quiet. A bar is a
surface like a fill and is bound by the same rule, so it is as bright as the readings allow and no
brighter; it MAY differ from the fill, and in the dark theme it does, because a full-height shape at the
fill's lightness is not distinguishable from the page. A Calendar day inside the window SHALL be painted
in the bar's own colour rather than the status's ordinary fill, because a rounded bar end cannot paint
itself and whatever lies behind its corner shows through. The fill remains the right value for every
surface that has no bar.

Because the bar is the lightest surface a marker is ever painted on, its luminance raises the floor for
every reading in the theme. The bar SHALL therefore be set no brighter than the readings can be told apart
above, even where a brighter bar would clear every contrast rule — a window whose brightness makes the
readings painted on it unreadable is not a more visible window.

No surface SHALL add a strip or stroke along a day cell's edge to distinguish a status. Such a line sits
8px from the menses stripe on the cell above, where the two read as a single mark, and a month of them is
a great deal of line to read past.

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

#### Scenario: The window carries the distinction from the days around it

- **WHEN** a user scans a Calendar month in either theme
- **THEN** the window is distinguishable from the days around it by its own shape
- **AND** that distinction does not depend on the fills beneath it

#### Scenario: Two tinted fills that are close in colour are not a defect

- **WHEN** two statuses' fills are close in colour
- **THEN** that is permitted provided each is legible against its markers and clear of the surface behind it
- **AND** the user can still tell the window from the days around it, and can get the precise status from
  the Status view, the summary, or a day's accessible text

### Requirement: Important fertility distinctions meet contrast and non-color requirements

Normal text in the affected fertility surfaces SHALL meet a contrast ratio of at least 4.5:1 against its adjacent background. Meaningful graphical state boundaries, markers, and indicator shapes SHALL meet a contrast ratio of at least 3:1 against adjacent colors. For a marker painted inside a Calendar day cell, the adjacent colors are every fill that cell can present in the active theme, which are the base surface, each collapsed phase fill, the post-calendar fill, and the forecast fill; meeting the ratio against the base surface alone does not satisfy this requirement. Only the readings that can actually be painted on a given fill SHALL be checked against that fill: a `Before` day is one that falls before the window's begin, and the begin is never after the first `High` or `Peak` reading, so a `Before` day can only ever carry a `Low` reading or none. Checking the full cross product instead would hold the palette to combinations the engine cannot produce, and would bury a genuinely excepted combination among impossible ones.

The three monitor readings SHALL additionally be mutually distinguishable from one another at the size the marker is actually drawn, so that a user can tell a Low reading from a Peak reading without consulting the legend. That distinction SHALL be carried by **lightness** wherever the theme's headroom allows, and not by hue alone. Hue discrimination degrades sharply below roughly 10px, while a lightness difference is readable at any size, and the markers are drawn at 10px in a day cell and 6px in the legend; two marks of equal lightness therefore read as one however far apart their hues, which is a failure the ratio rules above cannot detect because a hue-only pair can measure as well separated as a lightness-backed one. Where a single pair in a single theme knowingly falls short of the separation floor, that pair SHALL be named in the guard and SHALL be asserted individually at the ratio it is held to, so that a further regression on it still fails and the exception cannot widen to any other pair.

A status bar is a large filled area, not a boundary or an indicator shape, and SHALL be held to the fill rules rather than to a contrast ratio against the surface behind it: no fill in either theme reaches 3:1 against its page, and a large area does not need to. A bar SHALL instead be distinguishable from the surfaces and fills it sits beside by colour distance, in every theme.

The fertile window is a single interval, and the Calendar SHALL mark it as one object rather than as a run of interchangeable days: the window's first and last day SHALL each be presented differently from the days between them. The difference SHALL be a property of the bar's shape, and the bar SHALL NOT be accompanied by a separate mark beside it, since a mark in the bar's own colour is not visible and a mark in another colour is read as debris rather than as part of the bar. A window that no user can distinguish from the days around it by colour alone SHALL remain distinguishable by its shape, which spans the whole day.

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
- **AND** a fill is only checked against the readings the engine can place on it, so that a shortfall
  cannot be masked by combinations that cannot occur

#### Scenario: A Low reading is told apart from a Peak reading

- **WHEN** a user scans a Calendar month containing both a Low and a Peak reading at the size the markers are drawn
- **THEN** the two readings are visually distinguishable from one another without reading the legend
- **AND** the distinction does not rest on hue alone at that size

#### Scenario: The readings are separated on lightness, not only on hue

- **WHEN** the three monitor readings' palette is evaluated in a theme
- **THEN** each is assigned a distinct lightness, not only a distinct hue
- **AND** the separation survives being drawn at the size the legend uses

#### Scenario: A quiet phase is a visible area, not a tint the surface swallows

- **WHEN** a Calendar phase fill is drawn
- **THEN** it is a clear distance from the surface behind the cell, in both themes
- **AND** that distance is measured against the card, which is the surface a Calendar renders on and the
  binding one of the two

#### Scenario: The window is the most prominent phase surface

- **WHEN** the window and the two quiet phase fills are compared against the same surface
- **THEN** the window is further from that surface than either of them
- **AND** prominence is judged as distance from the surface rather than as lightness, because in the light
  theme the most prominent surface is the darkest and a lightness comparison gets that theme backwards

#### Scenario: A quiet phase is never read as the window

- **WHEN** a quiet phase fill and the window's colour are compared
- **THEN** their hues are far enough apart that making one lighter cannot close the gap
- **AND** neither sits at a hue close to a reading marker's, since a marker is painted on top of it

#### Scenario: The window's bar is legible as its own surface

- **WHEN** the window's bar is drawn in either theme
- **THEN** it is distinguishable from the surface behind the cell and from the fills it sits beside
- **AND** it is told from the page and from the fills it sits beside

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

### Requirement: Theme changes do not change interpretation

Changing between light and dark themes SHALL NOT change any derived status, source, forecast, provenance marker, or algorithm-enabled state.

#### Scenario: Theme toggle preserves data meaning

- **WHEN** the user switches themes while viewing the same records
- **THEN** the displayed status, source, forecast, and provenance meanings remain identical
- **AND** only their visual presentation changes

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

### Requirement: Monitor reading palette is guarded against drift

The colors assigned to the Low, High, and Peak monitor readings SHALL be verified against the contrast and distinguishability rules of this capability rather than chosen by eye, and the verification SHALL be repeatable so that a later edit to the palette cannot silently reintroduce a non-compliant value. A surface that encodes a monitor reading without consuming the shared monitor palette is unaffected by this requirement.

The same guard SHALL cover the window's bar, asserting its contrast against every reading marker, its distinguishability from the surfaces and fills around it, and that it is no darker than the fill it replaces on the Calendar, per theme. The bar is included in the surfaces a reading marker is checked against, because a reading on a window day sits on the bar. The guard SHALL read the values it checks from the stylesheet that the app actually loads, so that it cannot assert compliance for a palette that is no longer in use.

Reading the stylesheet SHALL mean reading **live declarations only**. A colour commented out is not a colour the app paints, and a guard that matches raw text will find a token inside a comment and report a clean pass for a palette that is not in use. An unterminated comment is the damaging case: it silently deletes every declaration after it, which in practice removed a whole theme's fills, and nothing that read the file as text noticed. The guard SHALL therefore strip comments before reading any value, and SHALL fail on a comment that is never closed.

The guard SHALL NOT assert that status fills are mutually distinguishable **as a precondition for a valid palette**, and SHALL record why: the requirement is that each fill be legible and clear of the surface behind it, which the guard does assert, and a palette that separates the fills further is not thereby more correct. Writing the fill-separation rule as a hard requirement once produced a palette that shipped near-black days to satisfy a rule the underlying constraint did not actually impose, and the same rule re-added later would do it again. The window's bar remains the surface that carries the distinction between the phases, and the guard continues to assert that it is the most prominent of them.

#### Scenario: Palette compliance is asserted, not assumed

- **WHEN** the monitor palette is evaluated
- **THEN** each reading's contrast against every Calendar fill is computed and asserted per theme
- **AND** a value that falls below the required ratio fails the check rather than passing unnoticed

#### Scenario: The window's bar compliance is asserted from the live stylesheet

- **WHEN** the guard evaluates the window's bar
- **THEN** it reads its value from the stylesheet the app loads
- **AND** it asserts it against every reading marker, against the surface behind it, and against the fills it sits beside

#### Scenario: A drifted stylesheet fails the guard

- **WHEN** a palette value is edited so that the window's bar or a monitor reading stops meeting its rule
- **THEN** the guard fails
- **AND** it does not pass because the check reads a stale copy of the palette

#### Scenario: A commented-out or unterminated token fails the guard

- **WHEN** a palette token the Calendar depends on is commented out, or a comment in the stylesheet is
  never closed
- **THEN** the guard fails rather than reporting a pass for a colour the app no longer paints
- **AND** the failure names the missing token or the unclosed comment

#### Scenario: Fill separation is not a precondition for a valid palette

- **WHEN** the guard is reviewed
- **THEN** it contains no assertion making mutual distinguishability of the status fills a condition of
  the palette being correct
- **AND** it does assert that each fill is legible against its markers and clear of the surface behind it
- **AND** it states that the window's bar carries the distinction between the phases

#### Scenario: A surface with its own reading encoding is not constrained by the shared palette

- **WHEN** a surface distinguishes monitor readings by a non-color channel such as mark size or height
- **THEN** it is not required to consume the shared monitor palette
- **AND** its readings remain distinguishable on their own terms
