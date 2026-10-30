# UFC | svc.sync_bout_ids

Give bouts stable identities and align spreadsheet references to those identities.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/ya1uS9XFsrlhq6e3) · [Sanitized snapshot](../../workflows/svc-sync-bout-ids.json)

## Identity and version

- Workflow ID: `ya1uS9XFsrlhq6e3`
- Published: `True`
- Published version: `cefcc33c-e278-4535-9fa9-ec7553d25483`
- Draft version: `cefcc33c-e278-4535-9fa9-ec7553d25483`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 18
- Timezone: `Australia/Sydney`

## How it works

1. Read Fight Card state and Fight Card A:I plus all Picks, Props and Fight Analysis columns.
2. Plan stable bout_id values, preferring official UFC bout identities where available, and map existing extraction rows to bouts.
3. If already synchronized, return unchanged. Otherwise write only planned identity/reference columns sequentially.
4. Read all affected tabs back and verify the planned identities before returning status.

## Important behavior and limits

fight_order can change when the card is rearranged; bout_id is the durable association. Keep Fight Card column I available and preserve existing row IDs and identity mappings. A read-back failure stops completion.

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

Called by: [UFC | 3. Analyse Picker Video Transcripts](3-analyse-picker-video-transcripts.md) via `Sync Bout IDs`


Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read Fight Card State | ufc_fight_card_state | get |  |

Terminal nodes in the saved graph: `Return Bout ID Status`, `Explain Write Failure`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Plan Bout IDs | code | [JavaScript](../../source/svc-sync-bout-ids/02-plan-bout-ids.js) |  |
| 3 | Read Fight Card State | dataTable | get ufc_fight_card_state | alwaysOutputData=True |
| 4 | Read Fight Card | googleSheets | read 'Fight Card'!A:I | executeOnce=True |
| 5 | Read Picks | googleSheets | read 'Picks'!A:ZZ | executeOnce=True |
| 6 | Read Props | googleSheets | read 'Props'!A:ZZ | executeOnce=True |
| 7 | Read Fight Analysis | googleSheets | read 'Fight Analysis'!A:ZZ | executeOnce=True |
| 8 | Bout IDs Need Writing? | if |  |  |
| 9 | Split Column Writes | code | [JavaScript](../../source/svc-sync-bout-ids/09-split-column-writes.js) |  |
| 10 | Each Column Write | splitInBatches |  |  |
| 11 | Write Column | googleSheets | update ={{ $json.range }} | onError=continueErrorOutput |
| 12 | Recheck Fight Card | googleSheets | read 'Fight Card'!A:I | executeOnce=True |
| 13 | Recheck Picks | googleSheets | read 'Picks'!A:ZZ | executeOnce=True |
| 14 | Recheck Props | googleSheets | read 'Props'!A:ZZ | executeOnce=True |
| 15 | Recheck Fight Analysis | googleSheets | read 'Fight Analysis'!A:ZZ | executeOnce=True |
| 16 | Verify Bout IDs | code | [JavaScript](../../source/svc-sync-bout-ids/16-verify-bout-ids.js) |  |
| 17 | Return Bout ID Status | code | [JavaScript](../../source/svc-sync-bout-ids/17-return-bout-id-status.js) |  |
| 18 | Explain Write Failure | code | [JavaScript](../../source/svc-sync-bout-ids/18-explain-write-failure.js) |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Read Fight Card State | 0 |
| Read Fight Card State | main | 0 | Read Fight Card | 0 |
| Read Fight Card | main | 0 | Read Picks | 0 |
| Read Picks | main | 0 | Read Props | 0 |
| Read Props | main | 0 | Read Fight Analysis | 0 |
| Read Fight Analysis | main | 0 | Plan Bout IDs | 0 |
| Plan Bout IDs | main | 0 | Bout IDs Need Writing? | 0 |
| Bout IDs Need Writing? | main | 0 | Split Column Writes | 0 |
| Bout IDs Need Writing? | main | 1 | Return Bout ID Status | 0 |
| Split Column Writes | main | 0 | Each Column Write | 0 |
| Each Column Write | main | 0 | Recheck Fight Card | 0 |
| Each Column Write | main | 1 | Write Column | 0 |
| Write Column | main | 0 | Each Column Write | 0 |
| Write Column | main | 1 | Explain Write Failure | 0 |
| Recheck Fight Card | main | 0 | Recheck Picks | 0 |
| Recheck Picks | main | 0 | Recheck Props | 0 |
| Recheck Props | main | 0 | Recheck Fight Analysis | 0 |
| Recheck Fight Analysis | main | 0 | Verify Bout IDs | 0 |
| Verify Bout IDs | main | 0 | Return Bout ID Status | 0 |

## Code and configuration

- `Plan Bout IDs`: [source](../../source/svc-sync-bout-ids/02-plan-bout-ids.js)
- `Split Column Writes`: [source](../../source/svc-sync-bout-ids/09-split-column-writes.js)
- `Verify Bout IDs`: [source](../../source/svc-sync-bout-ids/16-verify-bout-ids.js)
- `Return Bout ID Status`: [source](../../source/svc-sync-bout-ids/17-return-bout-id-status.js)
- `Explain Write Failure`: [source](../../source/svc-sync-bout-ids/18-explain-write-failure.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
