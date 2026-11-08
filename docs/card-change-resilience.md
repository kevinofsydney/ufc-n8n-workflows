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
| 4 Nov | Bashi's opponent changed from Brennan to Calderon | Not a failure; detected and applied after the fix | Applied 5 Nov |
| 5 Nov | ESPN dropped Bashi vs Calderon while UFC still listed it | Every card check failed on a bout-count mismatch (14 vs 13), freezing all other card changes | Fixed 5 Nov |
| 5 Nov | UFC moved José Souza's athlete URL from `jose-henrique` to `jose-souza` | Detect adopted the new slug bout ID, and `svc.sync_bout_ids` refused it, failing fight-week run 4650 | Fixed 5 Nov, 9 minutes later |
| 6 Nov | UFC's US edition (the region cookie the card services send) started rendering the main event, Cortes Acosta vs Walker, as a bare fight node with no athlete links or fight ID, so it was not read; the copy without the cookie was correct | First a wrong update: the reorders that followed from the pending removal applied at once, so Suarez vs Jandiroba became main event and Telegram reported the main event moved to fight 2. With that fixed, the 03:05 UTC check was unavailable instead | Fixed 6 Nov; card restored by fight-week run 4720 |

All of these come from four weaknesses:

1. **Bout identity depends on the source.** UFC IDs appear, disappear and change between checks, and UFC and ESPN spell names differently. Three workflows match bouts in three slightly different ways.
2. **Copies drift.** n8n Code nodes cannot share code, so the card builder and the matching rules are copied between workflows. A fix to one copy has twice missed the others.
3. **One unexpected row stops everything.** The card services throw on any inconsistency, so a single unmatched row blocks every other change, and analysis carries on with the old card.
4. **Combinations are untested.** Each change type had tests, but the 4 Nov failure needed two at once: a reshuffle and an ID switch.

## Already in place

- Removals and opponent changes wait for two checks in a row and for ESPN to drop the old bout, or for 12 hours over three checks if ESPN never does; more than three removals at once needs review.
- Additions, reorders, segment moves and detail changes apply on the first check.
- A bout waiting to leave keeps its fight number and segment, so nothing that only follows from its removal applies early. A waiting main event stays at fight 1 as main event; a replacement main event sits below it as `main_card` until the removal is confirmed.
- **An unreadable bout falls back to the copy without the region cookie.** Each bout on the UFC page is one list item, so the card services count list items against readable fights in each section. When the US copy has fewer readable fights, they use the copy fetched without the cookie, provided it matches the event URL and reads every bout; otherwise the check is unavailable.
- **Incomplete UFC pages are refused.** If the page title names a bout that its fight list leaves out while ESPN still lists it, the check counts as unavailable and keeps any pending change's count, instead of reading the gap as a removal. Populate refuses the same page.
- Planning uses the sheet's bout IDs, matching changed IDs by fighter names, and `svc.sync_bout_ids` upgrades the IDs afterwards.
- Repeated failed card checks raise a `card_check_unavailable` health alert.
- Renamed events are detected daily and reported on Telegram.
- **Silent card checks alert.** Within 72 hours of the event, a READY card with no recorded card check for 8 hours raises `card_check_stale`, whether checks are skipped or not running.
- Card incidents close on evidence, not on quiet time alone (`card-handling/auto-resolve.test.mjs`).
- The card services share one fighter-name matching rule, enforced by the verifier.
- Scenario tests cover each change type and the combinations seen so far: `node --test card-handling/card-changes.test.mjs` and `card-handling/card-handling.test.mjs`.
- **Fight-week card checks.** `UFC | 10. Fight-Week Card Check` runs the card steps every two hours in the 72 hours before the event, so a removal lands within about four hours of UFC and ESPN changing.
- **Unplaceable rows are set aside.** A Picks, Props or Fight Analysis row whose bout is not on the card is marked `VOID_UNMATCHED` and named in the card update message, instead of stopping every other change. Clear the status to restore it.
- **Builder drift fails the verifier.** `scripts/verify-docs.py` fails when the card builder in `svc.detect_card_changes` differs from `svc.populate_fight_card`.
- **Checks run on every pull request.** GitHub Actions runs the verifier and every test suite.
- **Waiting changes alert sooner in fight week.** Within two days of the event, a card change still waiting, usually for ESPN, raises `card_change_waiting` after 6 hours instead of 24.
- **The whole chain is tested.** `card-handling/card-chain.test.mjs` runs each change through the card update and then `svc.sync_bout_ids` on the resulting sheet, because a sync failure would still stop analysis.

## Plan

### 1. Test every card change before it reaches the live workflows (partly done)

- **Run all tests on every pull request.** Done: `.github/workflows/checks.yml`.
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

### 2. Use one definition of a bout (done)

- **Make the fighter pair the identity.** Match on the two fighters' names, with a unique surname match as fallback. Treat the UFC ID as an attribute to adopt when it appears, not as the key.
- **Keep one copy of the matching rules.** Done: the verifier fails when the two card builders differ, or when detect, apply and sync match fighter names differently. Apply split surnames at hyphens while sync did not, so apply could place a bout that sync then refused; fixed 5 Nov.

### 3. Apply what is safe instead of failing (partly done)

- **Isolate the unexpected.** Done for rows that match no bout: they are set aside, so `svc.sync_bout_ids` skips them. `svc.sync_bout_ids` itself still stops analysis on a conflict, deliberately. Its checks are about bout identity, and continuing would let new picks be written under conflicting IDs. The chain tests run every known card change through it instead.
- **Hold a bout ESPN doesn't list.** Done 5 Nov: the card builder no longer requires UFC and ESPN to list the same number of bouts. A UFC bout ESPN does not list at all is held out of the verified card, never the main event and at most three, instead of stopping the check. One already in the sheet stays where UFC places it, with the sheet's details; one new to the sheet is added once ESPN lists it. If ESPN has not listed it after 6 hours within two days of the event (24 hours earlier), `svc.health_sweep` alerts `card_bout_held` so it can be added by hand. A bout ESPN still lists after UFC dropped it now reaches the removal rule instead of failing the check.
- **Never edit silently.** Keep every guard that protects saved picks from being overwritten, but turn "stop everything" into "hold this bout and say why".
- **Report every card update.** Send one Telegram summary per update listing what was applied, what is waiting and why.

### 4. Check the card more often in fight week (done)

- **Check independently of analysis.** Done: `UFC | 10. Fight-Week Card Check`.
- **Don't wait forever for ESPN.** Done: the 6-hour fight-week alert flags a removal ESPN hasn't confirmed, and once UFC has shown the same removal for 12 hours over at least three checks it applies anyway. The card update message lists it under "Applied without ESPN". This replaced the planned Telegram button, which would only help if someone was watching.

### 5. Tell success from luck (partly done)

- **Close on evidence, not silence.** Auto-closing an incident after 12 quiet hours hid that the 4 Nov failure was only cleared by a later run. Done: a card-service incident now closes only after a later card check or build succeeded, or after 72 quiet hours with a warning to check the card. Since 9 Nov every card checked since the failure must have succeeded after it, so another event's good check no longer counts (on 8 Nov UFC 334's card closed a sync failure on the previous event), and a card step failing inside another workflow (Sync Bout IDs in analysis) counts as a card incident.
- **Make cards easy to compare.** Add a `/card` Telegram command that shows the saved card next to the current official card, so a mismatch is visible without opening n8n.

## Known gaps

- The 7 Nov card (Cortes Acosta vs Walker) keeps UFC's earlier bout IDs in its sheet, while its saved card holds the 13 re-issued ones. It was graded on 8 Nov with the earlier IDs, and grades are stored by pick_id, so re-keying the sheet now would separate picks from their grades. Leave it as is.
- Bout IDs that change after an event is graded are not carried into `ufc_pick_grades` or `ufc_prop_grades`.

- Changes made after the event starts are not applied; the card is locked.
