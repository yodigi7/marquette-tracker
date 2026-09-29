# Proposal

## Why

The "Marquette Tracker" title in the app shell is plain text. It sits at the top of every screen and
reads as a link, but clicking or tapping it does nothing. On a phone it is the most natural place to
tap to get back to the calendar from anywhere in the app, and today it is a dead spot that only
frustrates.

## What Changes

- The app title becomes a real link to the root route (`/`), which is the Calendar.
- The title is present on two surfaces — the narrow-viewport top bar and the wide-viewport
  navigation bar — and both must behave the same way.
- The title's appearance does not change. It gains no hover, focus, or active treatment: it becomes a
  link and nothing else, so the top bar looks exactly as it does today.
- The title is **not** marked as the current page when the Calendar is already open. The existing
  "Calendar" navigation item owns that highlight; the title is a shortcut home, not a location
  indicator, and two highlighted entries on one screen would be wrong.
- On wide viewports the title is moved out of the primary `<nav>` element and into the header
  alongside it, so the navigation continues to contain exactly the four primary destinations.

Nothing else changes: no new route, no new destination in the menu, no change to the engine, the
data model, or any printed document. The whole top bar is already `print:hidden`, so printouts are
untouched.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: adds a requirement that the application title is a link to the root/Calendar route
  from every view and on both viewport surfaces, with a visible affordance, and is never marked as
  the current page.

## Impact

- **Affected code**: `src/app/layout.tsx` (both title occurrences) and
  `src/app/__tests__/layout.test.tsx` / `src/app/__tests__/hash-router.test.tsx` (coverage).
- **Specs**: `app-shell` gains one requirement; no existing requirement is removed or rewritten.
- **Dependencies**: none added.
- **Data / engine**: untouched. No stored value, no protocol rule, no forecast is affected.
- **Backward compatibility**: the four primary navigation destinations, their labels, and their
  fragment routes are unchanged. Existing `app-shell` requirements continue to hold.
