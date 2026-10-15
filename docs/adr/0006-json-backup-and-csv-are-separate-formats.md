# JSON backup and CSV are separate formats

Settings offers two file actions that are deliberately not variants of each other: a versioned JSON
backup that the app can read back, and a CSV that it cannot. They are never merged.

The two answer different questions with different guarantees. A backup must round-trip — every field the
app stored, with identity intact, so a restore is exact. A spreadsheet file must be readable at a glance
and must not fight the tools that open it, which is why it carries no engine output and no record
identity: fertile windows and forecasts are recomputed on load, and UUIDs would be noise to the person
reading the file.

Merging them would force one set of trade-offs on both. Either the CSV carries UUIDs and revision flags to
satisfy a backup's guarantees, or the JSON drops something a restore needs. Merge-import behaviour is
tracked separately in GitHub issue #6.
