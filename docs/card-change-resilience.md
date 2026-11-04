# Card-change resilience plan

Fight cards change through fight week: opponents are replaced, bouts are added or cancelled, the main card is reshuffled, and the event itself can be renamed. The pipeline has to absorb those changes without failing. This page records what has gone wrong so far, what is already fixed, and the planned work, in priority order.

## What has failed so far

| Date | Change on the card | What broke | Status |
| --- | --- | --- | --- |
| 26 Oct | UFC page date didn't match the stored event (cause not recorded) | Card build stopped | No repeat since |
| 1 Nov | Main event cancelled and the event renamed | `event_key` overwritten, orphaning card state and videos | Fixed 1 Nov |
| 1 Nov | Rebuilt card served without UFC bout IDs | Every `bout_id` collapsed to `ufc:` | Fixed 1 Nov |
| 1 Nov | Opponent named differently by UFC and ESPN | Bout could not be matched | Fixed 1 Nov |
| 1 Nov | Same card | `svc.detect_card_changes` kept an unpatched copy of the builder, so checks would have failed silently | Fixed 2 Nov, before it ran |
| 2 Nov | Main event replaced by two new fighters (simulated) | Two main events at once, so the change never applied | Fixed 2 Nov |
| 4 Nov | Main card reshuffled while UFC started sending numeric IDs for 3 bouts | `svc.apply_card_changes` threw on picks still keyed by the old IDs | Fixed 5 Nov |

All of these come from four weaknesses:

1. **Bout identity depends on the source.** UFC IDs appear, disappear and change between checks, and UFC and ESPN spell names differently. Three workflows match bouts in three slightly different ways.
2. **Copies drift.** n8n Code nodes cannot share code, so the card builder and the matching rules are copied between workflows. A fix to one copy has twice missed the others.
3. **One unexpected row stops everything.** The card services throw on any inconsistency, so a single unmatched row blocks every other change, and analysis carries on with the old card.
4. **Combinations are untested.** Each change type had tests, but the 4 Nov failure needed two at once: a reshuffle and an ID switch.

## Already in place

- Removals and opponent changes wait for two checks in a row and for ESPN to drop the old bout; more than three removals at once needs review.
- Additions, reorders, segment moves and detail changes apply on the first check.
- A waiting old main event stays on as `main_card`, so a replacement main event applies at once.
- Planning uses the sheet's bout IDs, matching changed IDs by fighter names, and `svc.sync_bout_ids` upgrades the IDs afterwards.
- Repeated failed card checks raise a `card_check_unavailable` health alert.
- Renamed events are detected daily and reported on Telegram.
- Scenario tests cover each change type and the combinations seen so far: `node --test card-handling/card-changes.test.mjs` and `card-handling/card-handling.test.mjs`.

## Plan

### 1. Test every card change before it reaches the live workflows (next)

- **Run all tests on every pull request.** Add a GitHub Actions workflow that runs `scripts/verify-docs.py` and every `node --test` suite. Nothing runs them automatically today.
- **Grow the scenario matrix.** Cover each change type alone and combined with an ID switch, a reorder, a rename and ESPN lag:
  - added, removed or cancelled bouts
  - opponent replaced
  - main event swapped
  - segment moves
  - weight class or rounds changed
  - fighter renamed
  - more than three removals
  - a change within 24 hours of the event
- **Replay real runs.** When a card check reports `CHANGED` or a card service fails, save its inputs as a sanitized fixture, without transcripts or sheet IDs, and add it to the replay suite. The 4 Nov failure was reproduced this way before fixing.
- **Replay before publishing.** Before publishing any card workflow, replay the last week's real card-check inputs through the new code and compare the result with what the live run produced. Add this to the publishing checklist in [operations](operations.md).

### 2. Use one definition of a bout (soon)

- **Make the fighter pair the identity.** Match on the two fighters' names, with a unique surname match as fallback. Treat the UFC ID as an attribute to adopt when it appears, not as the key.
- **Keep one copy of the matching rules.** Write the builder and matching rules once in `source/shared/`. Have the verifier fail when a workflow's copy differs, until n8n can share them through a called sub-workflow.

### 3. Apply what is safe instead of failing (soon)

- **Isolate the unexpected.** When planning meets something it can't place, such as a row for an unknown bout, set that bout aside instead of throwing. Apply the rest, mark the state `PARTLY_APPLIED` with the reason, and alert once.
- **Never edit silently.** Keep every guard that protects saved picks from being overwritten, but turn "stop everything" into "hold this bout and say why".
- **Report every card update.** Send one Telegram summary per update listing what was applied, what is waiting and why.

### 4. Check the card more often in fight week (soon)

- **Check independently of analysis.** Card checks run only inside analysis, one to three times a day, and a removal needs two checks, so it can take most of a day to land. In the final 72 hours, run the card check every two hours on its own schedule, so changes land before new picks are extracted.
- **Don't wait forever for ESPN.** ESPN usually follows within hours, but not always. If UFC has dropped a bout for 12 hours and ESPN still lists it, send a Telegram message with a button to apply the removal, instead of waiting indefinitely.

### 5. Tell success from luck (later)

- **Close on evidence, not silence.** Auto-closing an incident after 12 quiet hours hid that the 4 Nov failure was only cleared by a later run. Close a card incident only when a later card check and apply both succeed for the same event.
- **Make cards easy to compare.** Add a `/card` Telegram command that shows the saved card next to the current official card, so a mismatch is visible without opening n8n.

## Known gaps

- Changes made after the event starts are not applied; the card is locked.
- `svc.apply_card_changes` still writes blank aliases for bouts it adds or re-identifies.
- A card check that never records a result, such as `SKIPPED`, still raises no alert.
