# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the
actual label strings used on this repo's GitHub tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

All five exist on the tracker. Four were created during setup; `wontfix` predates it and was
left with its original description and colour.

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding
label string from this table.

Edit the "Label in our tracker" column to match whatever vocabulary you actually use. The repo
also carries the GitHub defaults (`bug`, `enhancement`, `question`, and others), which the skills
do not use but which are useful for ordinary issue filing.
