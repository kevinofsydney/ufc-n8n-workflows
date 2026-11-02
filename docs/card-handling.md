# Fight-card handling changes

**Status: committed in this repository, not published.** The three source files listed in [`inventory/pending-live.json`](../inventory/pending-live.json) differ from their live snapshots until the steps below are approved and run. Until then, the live pipeline still has both gaps.

## Silent UNAVAILABLE card checks

`svc.detect_card_changes` catches a card it cannot verify and returns `UNAVAILABLE`. Analysis continues, nothing fails and nothing alerts.

`Record Card Check` stores `change_status` and `change_checked_at`, but that is not enough to alert on. `change_checked_at` is only the latest check, the reason is not stored, and `svc.apply_card_changes` overwrites `change_status` when it applies a pending change straight after a failed check. The pending-change fields stay reserved for the pending change.

The change adds a consecutive-failure streak that only `Record Card Check` writes. Any verified check clears it, including one that reports a change. `svc.health_sweep` then raises `card_check_unavailable` when all of these hold:

- The event is active, has not started and is within five days.
- The card is READY or PRESERVED. Other card states already raise `card_not_ready`.
- There were at least two failed checks in a row, or the streak started at least 12 hours ago.

Analysis runs one to three times a day, so a single failed check can stay the latest result for most of a day. That is why age counts as well as repeats. The incident follows the sweep's existing pattern: alert when new or reopened, remind once a day and resolve when the condition clears.

### Schema change

`ufc_fight_card_state` needs three new columns before `svc.detect_card_changes` is published:

| Column | Type | Written by Record Card Check |
| --- | --- | --- |
| card_unavailable_since | date | `={{ $json.card_check.unavailable_since \|\| null }}` |
| card_unavailable_count | number | `={{ Number($json.card_check.unavailable_count \|\| 0) }}` |
| card_unavailable_reason | string | `={{ $json.card_check.unavailable_reason \|\| '' }}` |

Existing rows start empty. The sweep treats an empty `card_unavailable_since` as no streak, so publishing it before the first new check raises no false alert. The [table reference](data-tables.md) is generated from the live schema and will show these columns after the next refresh.

## Lost ESPN alias

When UFC and ESPN name a fighter differently, `Build Verified UFC Card` sets the ESPN spelling as an alias. `Build Fight Card Matrix` then overwrote it with the verified nickname. The two now merge, ESPN spelling first, with case- and accent-insensitive de-duplication: `Jose Henrique, Canela`.

The comma format is valid because no code parses the alias cell. `Build Fight Card Context` trims it and places it in the prompt as `- Fighter B aliases: ...`, and the read-back and preflight checks only fingerprint its text. `svc.detect_card_changes` does not compare aliases, so a merged alias does not report as a card change.

### Impact on the current card

Checked read-only on 2 November 2026 for UFC Fight Night: Cortes Acosta vs Walker (8 November UTC):

- **Confirmed lost.** The saved card has `fighter_b_aliases` = `Canela` for José Souza. Recomputing the saved `source_fingerprint` proves the builder produced exactly `Jose Henrique` before the matrix step replaced it.
- **No picks affected yet.** The event has three videos and none has been analysed, so no pick has been dropped.
- **Risk is low but real.** Two transcripts are captured. Lucrative James uses Jose Souza and "Jose Enrique" interchangeably, and Artem MMA uses auto-captioned forms of Souza. Both also name Jonny Parsons. The prompt tells the model to ignore a fighter it cannot reliably map to the card, so a picker using only the ESPN name could lose the pick with no error. That loss has not been observed.

### Backfill

**The existing READY card needs a backfill.** `svc.populate_fight_card` only writes empty cards and the card check does not rewrite aliases, so publishing alone leaves this row unchanged.

The alias cell is part of `card_fingerprint`, so changing only the sheet makes the preflight stop analysis with "data differs from the verified automatic card". All three values must change together, between analysis runs:

| Target | Old | New |
| --- | --- | --- |
| Event sheet `Fight Card!E15` (fight 14, fighter_b_aliases) | `Canela` | `Jose Henrique, Canela` |
| State `source_card_json`, fight 14 `fighter_b_aliases` | `Canela` | `Jose Henrique, Canela` |
| State `card_fingerprint` | `fnv1a-f22a24f9` | `fnv1a-b97cb86f` |

The old fingerprint was reproduced from the saved card, and the new one uses the same function. `source_fingerprint` does not change. Confirm the row and the old values again immediately before writing.

## Planned live change

Nothing here has been run. Each step needs the owner's approval.

1. Re-read the three published workflows and confirm they still match the 2 November snapshots.
2. Add the three columns to `ufc_fight_card_state`.
3. Update and publish `svc.detect_card_changes`: the `Compare Card Changes` code, plus the three `Record Card Check` mappings and matching schema entries.
4. Update and publish `svc.health_sweep`: the `Sweep Pipeline Health` code.
5. Update and publish `svc.populate_fight_card`: the `Build Fight Card Matrix` code.
6. Apply the backfill above between analysis runs, then confirm the next analysis passes its preflight.
7. Refresh the snapshots, empty `inventory/pending-live.json`, and update the narrative that describes these changes as unpublished.

The next production analysis run is the first real exercise of the detection code published on 2 November as well as of these changes. To roll back, restore the previous workflow versions. The extra columns are harmless when unused, and the backfill can stay because the alias remains correct.

## Tests

Run `node --test card-handling/card-handling.test.mjs`. The 26 fixture tests execute the actual files in `source/` with synthetic n8n context and no live service. They cover the merge from builder to prompt context, streak start, growth and reset, and the sweep's thresholds, window, card-state gate, daily reminder and resolution. Against the previous sources, 17 of them fail.

The tests do not run the `Record Card Check` mappings, which exist only in the workflow graph. Check those on the first production check after publishing.

## Gaps these changes leave open

These are also recorded in the [known limits](verification.md#known-limits-recorded-from-the-source):

- A check that never records anything raises no `card_check_unavailable` incident. That covers `SKIPPED` checks, for example a READY card with no official UFC URL, and an error that analysis continues past through `Continue Without Card Check`.
- A failed check overwrites `change_status` with `UNAVAILABLE`, so an open `card_change_waiting` incident resolves while the pending change is still waiting. The pending change itself is kept, and the new condition alerts in its place once its threshold is met.
- `svc.apply_card_changes` writes blank aliases for a bout it adds, and for a bout whose `bout_id` changes, so an ESPN spelling on the official card is not carried through that path.
