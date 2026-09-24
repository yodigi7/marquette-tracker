# Proposal

## Why

The Calendar's color-only dot does not clearly communicate that it represents intercourse. A heart provides an immediate visual cue in both daily cells and the legend.

## What Changes

- Replace the Calendar day-cell intercourse dot with a small filled red heart.
- Use the same heart marker in the Calendar legend.
- Add focused component coverage for the marker.
- Leave the cycle chart, stored data, engine, and other Calendar markers unchanged.

## Capabilities

### New Capabilities

- `calendar`: Represent recorded intercourse with a small filled red heart in Calendar day cells and the legend.

### Modified Capabilities

None.

## Impact

- `src/features/calendar/day-cell.tsx`: Replace the intercourse dot with the heart icon.
- `src/features/calendar/index.tsx`: Update the intercourse legend entry.
- `src/features/calendar/__tests__/calendar.test.tsx`: Verify the new visual marker.
- `lucide-react`: Reuse the existing icon dependency; no new dependency is required.
