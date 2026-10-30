# UFC | svc.populate_fight_card

Build a verified Fight Card for an empty event sheet while protecting existing extraction.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/SBBK0hOGx2uPYpm4) · [Sanitized snapshot](../../workflows/svc-populate-fight-card.json)

## Identity and version

- Workflow ID: `SBBK0hOGx2uPYpm4`
- Published: `True`
- Published version: `552df8ec-ee31-4838-82d1-c139c3c4bce4`
- Draft version: `552df8ec-ee31-4838-82d1-c139c3c4bce4`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 40
- Timezone: `Australia/Sydney`

## How it works

1. Validate the event and classify the existing Fight Card and saved card state.
2. For an empty destination, inspect existing extraction before any population write.
3. Fetch the official UFC event page with the US-region cookie and ESPN data around the event date. Cross-check card identity, competitors, order and rounds.
4. Fetch official athlete profiles for verified nickname/alias context and construct the Fight Card matrix.
5. Recheck that the destination is still safe, write the card, read it back and verify before recording READY state and event metadata.
6. Preserve existing cards; a separate verified path can backfill missing weight classes and read them back. Pending/unpublished official cards return the configured pending state.

## Important behavior and limits

UFC supplies official order/names; ESPN is a verification source. This is not the general card-replacement worker: detect_card_changes and apply_card_changes handle subsequent changes. Existing extracted picks must not be silently overwritten.

## Triggers and input contract

```json
[
  {
    "name": "When Called",
    "type": "n8n-nodes-base.executeWorkflowTrigger",
    "parameters": {
      "inputSource": "passthrough"
    }
  }
]
```

Passthrough triggers accept caller JSON rather than enforcing a declared field schema. Inspect the linked validation/normalization code and caller mappings for runtime requirements. An omitted schedule field uses its n8n node default; see [schedules](../schedules.md).

## Connections to other workflows

Called by: [UFC | svc.ensure_event_spreadsheet](svc-ensure-event-spreadsheet.md) via `Populate Empty UFC Fight Card`


Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read Stored UFC Event | ufc_events | get |  |
| Read Fight Card State | ufc_fight_card_state | get |  |
| Record Pending Fight Card | ufc_fight_card_state | upsert | event_key, spreadsheet_id, status, source_url, espn_event_id, source_fingerprint, card_fingerprint, source_card_json, checked_at, parser_version, message |
| Record Ready Fight Card | ufc_fight_card_state | upsert | event_key, spreadsheet_id, status, source_url, espn_event_id, source_fingerprint, card_fingerprint, source_card_json, checked_at, parser_version, message, initialized_at |
| Record Existing Card Readiness | ufc_fight_card_state | upsert | event_key, spreadsheet_id, status, card_fingerprint, source_card_json, initialized_at, checked_at, parser_version |

Terminal nodes in the saved graph: `Return UFC Card Status`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Validate UFC Card Input | code | [JavaScript](../../source/svc-populate-fight-card/02-validate-ufc-card-input.js) |  |
| 3 | Read Stored UFC Event | dataTable | get ufc_events | alwaysOutputData=True |
| 4 | Prepare UFC Card Request | code | [JavaScript](../../source/svc-populate-fight-card/04-prepare-ufc-card-request.js) |  |
| 5 | Read Fight Card State | dataTable | get ufc_fight_card_state | alwaysOutputData=True |
| 6 | Read Fight Card | googleSheets | read 'Fight Card'!A:H |  |
| 7 | Classify Existing Fight Card | code | [JavaScript](../../source/svc-populate-fight-card/07-classify-existing-fight-card.js) |  |
| 8 | Needs Fight Card Population? | if |  |  |
| 9 | Check Existing Picks | googleSheets | read 'Picks'!A2:AZ |  |
| 10 | Check Existing Props | googleSheets | read 'Props'!A2:AZ |  |
| 11 | Check Existing Fight Analysis | googleSheets | read 'Fight Analysis'!A2:AZ |  |
| 12 | Protect Existing Extraction | code | [JavaScript](../../source/svc-populate-fight-card/12-protect-existing-extraction.js) |  |
| 13 | Fetch Official UFC Card | httpRequest | ={{ $json.source_url }} |  |
| 14 | Extract Official UFC Card | html | extractHtmlContent |  |
| 15 | Fetch ESPN Round Data | httpRequest | =https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard?dates={{ DateTime.fromISO($('Prepare UFC Card Request').first().json.event_datetime_local).minus({days:1}).toFormat('yyyyLLdd') }}-{{ DateTime.fromISO($('Prepare UFC Card Request').first().json.event_datetime_local).plus({days:1}).toFormat('yyyyLLdd') }} |  |
| 16 | Build Verified UFC Card | code | [JavaScript](../../source/svc-populate-fight-card/16-build-verified-ufc-card.js) |  |
| 17 | Prepare Athlete Lookups | code | [JavaScript](../../source/svc-populate-fight-card/17-prepare-athlete-lookups.js) |  |
| 18 | Fetch Official Athlete Profiles | httpRequest | ={{ $json.profile_url }} | onError=continueRegularOutput |
| 19 | Prepare Profile HTML | code | [JavaScript](../../source/svc-populate-fight-card/19-prepare-profile-html.js) |  |
| 20 | Extract Official Nicknames | html | extractHtmlContent |  |
| 21 | Build Fight Card Matrix | code | [JavaScript](../../source/svc-populate-fight-card/21-build-fight-card-matrix.js) |  |
| 22 | Preview Only? | if |  |  |
| 23 | Recheck Empty Fight Card | googleSheets | read 'Fight Card'!A:H |  |
| 24 | Confirm Empty Destination | code | [JavaScript](../../source/svc-populate-fight-card/24-confirm-empty-destination.js) |  |
| 25 | Record Pending Fight Card | dataTable | upsert ufc_fight_card_state |  |
| 26 | Prepare Fight Card Write | code | [JavaScript](../../source/svc-populate-fight-card/26-prepare-fight-card-write.js) |  |
| 27 | Write Empty Fight Card | googleSheets | update ={{ "'Fight Card'!A1:H" + ($("Build Fight Card Matrix").first().json.matrix.length+1) }} |  |
| 28 | Verify Written Fight Card | googleSheets | read 'Fight Card'!A:H |  |
| 29 | Verify Fight Card Read Back | code | [JavaScript](../../source/svc-populate-fight-card/29-verify-fight-card-read-back.js) |  |
| 30 | Record Ready Fight Card | dataTable | upsert ufc_fight_card_state |  |
| 31 | Return UFC Card Status | code | [JavaScript](../../source/svc-populate-fight-card/31-return-ufc-card-status.js) |  |
| 32 | Record Existing Card Readiness | dataTable | upsert ufc_fight_card_state |  |
| 33 | Needs Weight Class Backfill? | if |  |  |
| 34 | Preview Weight Class Backfill? | if |  |  |
| 35 | Fetch ESPN Weight Classes | httpRequest | =https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard?dates={{ DateTime.fromISO($('Prepare UFC Card Request').first().json.event_datetime_local).minus({days:1}).toFormat('yyyyLLdd') }}-{{ DateTime.fromISO($('Prepare UFC Card Request').first().json.event_datetime_local).plus({days:1}).toFormat('yyyyLLdd') }} |  |
| 36 | Write Weight Class Column | googleSheets | update ={{ "'Fight Card'!H1:H" + ($("Build Weight Class Backfill").first().json.rows.length) }} |  |
| 37 | Verify Weight Class Column | googleSheets | read 'Fight Card'!A:H |  |
| 38 | Build Weight Class Backfill | code | [JavaScript](../../source/svc-populate-fight-card/38-build-weight-class-backfill.js) |  |
| 39 | Verify Weight Class Read Back | code | [JavaScript](../../source/svc-populate-fight-card/39-verify-weight-class-read-back.js) |  |
| 40 | Official Card Pending? | if |  |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Validate UFC Card Input | 0 |
| Validate UFC Card Input | main | 0 | Read Stored UFC Event | 0 |
| Read Stored UFC Event | main | 0 | Prepare UFC Card Request | 0 |
| Prepare UFC Card Request | main | 0 | Read Fight Card State | 0 |
| Read Fight Card State | main | 0 | Read Fight Card | 0 |
| Read Fight Card | main | 0 | Classify Existing Fight Card | 0 |
| Classify Existing Fight Card | main | 0 | Needs Fight Card Population? | 0 |
| Needs Fight Card Population? | main | 0 | Check Existing Picks | 0 |
| Needs Fight Card Population? | main | 1 | Needs Weight Class Backfill? | 0 |
| Check Existing Picks | main | 0 | Check Existing Props | 0 |
| Check Existing Props | main | 0 | Check Existing Fight Analysis | 0 |
| Check Existing Fight Analysis | main | 0 | Protect Existing Extraction | 0 |
| Protect Existing Extraction | main | 0 | Fetch Official UFC Card | 0 |
| Fetch Official UFC Card | main | 0 | Extract Official UFC Card | 0 |
| Extract Official UFC Card | main | 0 | Fetch ESPN Round Data | 0 |
| Fetch ESPN Round Data | main | 0 | Build Verified UFC Card | 0 |
| Prepare Athlete Lookups | main | 0 | Fetch Official Athlete Profiles | 0 |
| Fetch Official Athlete Profiles | main | 0 | Prepare Profile HTML | 0 |
| Prepare Profile HTML | main | 0 | Extract Official Nicknames | 0 |
| Extract Official Nicknames | main | 0 | Build Fight Card Matrix | 0 |
| Build Fight Card Matrix | main | 0 | Preview Only? | 0 |
| Preview Only? | main | 0 | Return UFC Card Status | 0 |
| Preview Only? | main | 1 | Recheck Empty Fight Card | 0 |
| Recheck Empty Fight Card | main | 0 | Confirm Empty Destination | 0 |
| Confirm Empty Destination | main | 0 | Record Pending Fight Card | 0 |
| Record Pending Fight Card | main | 0 | Prepare Fight Card Write | 0 |
| Prepare Fight Card Write | main | 0 | Write Empty Fight Card | 0 |
| Write Empty Fight Card | main | 0 | Verify Written Fight Card | 0 |
| Verify Written Fight Card | main | 0 | Verify Fight Card Read Back | 0 |
| Verify Fight Card Read Back | main | 0 | Record Ready Fight Card | 0 |
| Record Ready Fight Card | main | 0 | Return UFC Card Status | 0 |
| Record Existing Card Readiness | main | 0 | Return UFC Card Status | 0 |
| Needs Weight Class Backfill? | main | 0 | Fetch ESPN Weight Classes | 0 |
| Needs Weight Class Backfill? | main | 1 | Record Existing Card Readiness | 0 |
| Fetch ESPN Weight Classes | main | 0 | Build Weight Class Backfill | 0 |
| Build Weight Class Backfill | main | 0 | Preview Weight Class Backfill? | 0 |
| Preview Weight Class Backfill? | main | 0 | Return UFC Card Status | 0 |
| Preview Weight Class Backfill? | main | 1 | Write Weight Class Column | 0 |
| Write Weight Class Column | main | 0 | Verify Weight Class Column | 0 |
| Verify Weight Class Column | main | 0 | Verify Weight Class Read Back | 0 |
| Verify Weight Class Read Back | main | 0 | Record Existing Card Readiness | 0 |
| Build Verified UFC Card | main | 0 | Official Card Pending? | 0 |
| Official Card Pending? | main | 0 | Return UFC Card Status | 0 |
| Official Card Pending? | main | 1 | Prepare Athlete Lookups | 0 |

## Code and configuration

- `Validate UFC Card Input`: [source](../../source/svc-populate-fight-card/02-validate-ufc-card-input.js)
- `Prepare UFC Card Request`: [source](../../source/svc-populate-fight-card/04-prepare-ufc-card-request.js)
- `Classify Existing Fight Card`: [source](../../source/svc-populate-fight-card/07-classify-existing-fight-card.js)
- `Protect Existing Extraction`: [source](../../source/svc-populate-fight-card/12-protect-existing-extraction.js)
- `Build Verified UFC Card`: [source](../../source/svc-populate-fight-card/16-build-verified-ufc-card.js)
- `Prepare Athlete Lookups`: [source](../../source/svc-populate-fight-card/17-prepare-athlete-lookups.js)
- `Prepare Profile HTML`: [source](../../source/svc-populate-fight-card/19-prepare-profile-html.js)
- `Build Fight Card Matrix`: [source](../../source/svc-populate-fight-card/21-build-fight-card-matrix.js)
- `Confirm Empty Destination`: [source](../../source/svc-populate-fight-card/24-confirm-empty-destination.js)
- `Prepare Fight Card Write`: [source](../../source/svc-populate-fight-card/26-prepare-fight-card-write.js)
- `Verify Fight Card Read Back`: [source](../../source/svc-populate-fight-card/29-verify-fight-card-read-back.js)
- `Return UFC Card Status`: [source](../../source/svc-populate-fight-card/31-return-ufc-card-status.js)
- `Build Weight Class Backfill`: [source](../../source/svc-populate-fight-card/38-build-weight-class-backfill.js)
- `Verify Weight Class Read Back`: [source](../../source/svc-populate-fight-card/39-verify-weight-class-read-back.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
