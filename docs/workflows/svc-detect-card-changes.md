# UFC | svc.detect_card_changes

Detect differences between the saved Fight Card and the current official card.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/UDRrGRyeFPL9Lk3S) · [Sanitized snapshot](../../workflows/svc-detect-card-changes.json)

## Identity and version

- Workflow ID: `UDRrGRyeFPL9Lk3S`
- Published: `True`
- Published version: `b3cb0ce1-ad25-421a-9e0e-64073ee3ad23`
- Draft version: `b3cb0ce1-ad25-421a-9e0e-64073ee3ad23`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 12
- Timezone: `Australia/Sydney`

## How it works

1. Prepare the event source URL and skip unsuitable requests according to the guard path.
2. Read saved Fight Card and state, fetch the official UFC page and ESPN cross-check data.
3. Compare bouts to identify additions, removals, replacements, order changes, metadata changes and adoption of official UFC bout IDs.
4. Persist the comparison, fingerprints and pending change details in ufc_fight_card_state and return card-check metadata.

## Important behavior and limits

This workflow records a proposed difference and does not edit the spreadsheet. Removal/replacement safety depends on cross-source confirmation and the apply worker's gates; a changed page alone should not erase predictions.

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

Called by: [UFC | 3. Analyse Picker Video Transcripts](3-analyse-picker-video-transcripts.md) via `Detect Card Changes`


Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read Fight Card State | ufc_fight_card_state | get |  |
| Record Card Check | ufc_fight_card_state | update | change_status, change_checked_at, pending_change_json, pending_change_fingerprint, pending_seen_count, pending_first_seen_at, source_card_json, official_card_json |

Terminal nodes in the saved graph: `Return Card Check`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Read Fight Card State | dataTable | get ufc_fight_card_state | alwaysOutputData=True |
| 3 | Read Fight Card | googleSheets | read 'Fight Card'!A:I | executeOnce=True |
| 4 | Prepare UFC Card Request | code | [JavaScript](../../source/svc-detect-card-changes/04-prepare-ufc-card-request.js) |  |
| 5 | Can Check Card? | if |  |  |
| 6 | Fetch Official UFC Card | httpRequest | ={{ $json.source_url }} |  |
| 7 | Extract Official UFC Card | html | extractHtmlContent |  |
| 8 | Fetch ESPN Round Data | httpRequest | =https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard?dates={{ DateTime.fromISO($('Prepare UFC Card Request').first().json.event_datetime_local).minus({days:1}).toFormat('yyyyLLdd') }}-{{ DateTime.fromISO($('Prepare UFC Card Request').first().json.event_datetime_local).plus({days:1}).toFormat('yyyyLLdd') }} |  |
| 9 | Compare Card Changes | code | [JavaScript](../../source/svc-detect-card-changes/09-compare-card-changes.js) |  |
| 10 | Record Card Check | dataTable | update ufc_fight_card_state |  |
| 11 | Card Check Skipped | code | [JavaScript](../../source/svc-detect-card-changes/11-card-check-skipped.js) |  |
| 12 | Return Card Check | code | [JavaScript](../../source/svc-detect-card-changes/12-return-card-check.js) |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Read Fight Card State | 0 |
| Read Fight Card State | main | 0 | Read Fight Card | 0 |
| Read Fight Card | main | 0 | Prepare UFC Card Request | 0 |
| Prepare UFC Card Request | main | 0 | Can Check Card? | 0 |
| Can Check Card? | main | 0 | Fetch Official UFC Card | 0 |
| Can Check Card? | main | 1 | Card Check Skipped | 0 |
| Fetch Official UFC Card | main | 0 | Extract Official UFC Card | 0 |
| Extract Official UFC Card | main | 0 | Fetch ESPN Round Data | 0 |
| Fetch ESPN Round Data | main | 0 | Compare Card Changes | 0 |
| Compare Card Changes | main | 0 | Record Card Check | 0 |
| Record Card Check | main | 0 | Return Card Check | 0 |
| Card Check Skipped | main | 0 | Return Card Check | 0 |

## Code and configuration

- `Prepare UFC Card Request`: [source](../../source/svc-detect-card-changes/04-prepare-ufc-card-request.js)
- `Compare Card Changes`: [source](../../source/svc-detect-card-changes/09-compare-card-changes.js)
- `Card Check Skipped`: [source](../../source/svc-detect-card-changes/11-card-check-skipped.js)
- `Return Card Check`: [source](../../source/svc-detect-card-changes/12-return-card-check.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
