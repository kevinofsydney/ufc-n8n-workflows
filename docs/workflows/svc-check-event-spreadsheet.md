# UFC | svc.check_event_spreadsheet

Check the event spreadsheet contract before analysis without changing sheet data.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/GQs7zaGeF1vZBRaj) · [Sanitized snapshot](../../workflows/svc-check-event-spreadsheet.json)

## Identity and version

- Workflow ID: `GQs7zaGeF1vZBRaj`
- Published: `True`
- Published version: `5c02111d-88df-4cad-a1b9-d8b3d514145d`
- Draft version: `5c02111d-88df-4cad-a1b9-d8b3d514145d`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 10
- Timezone: `Australia/Sydney`

## How it works

1. Require exactly one event with a valid spreadsheet ID and construct tab/header contracts.
2. Read headers for Picks, Props, Extraction Log, Fight Analysis and Transcripts, plus Fight Card and card-state data.
3. Validate required columns, exact/allowed header rules and the card-state expectations; return the event with schema metadata or throw an actionable mismatch.

## Important behavior and limits

Some tabs require exact schemas; Transcripts and Fight Card allow additional fields. Picks has legacy permitted duplicate extraction metadata headers. Optional bout_id columns support the stable-ID migration. Do not weaken this guard just to let malformed sheets continue.

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

Called by: [UFC | 3. Analyse Picker Video Transcripts](3-analyse-picker-video-transcripts.md) via `Check UFC Spreadsheet`


Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read UFC Fight Card State | ufc_fight_card_state | get |  |

Terminal nodes in the saved graph: `Validate Spreadsheet Headers`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Prepare Schema Check | code | [JavaScript](../../source/svc-check-event-spreadsheet/02-prepare-schema-check.js) |  |
| 3 | Validate Spreadsheet Headers | code | [JavaScript](../../source/svc-check-event-spreadsheet/03-validate-spreadsheet-headers.js) |  |
| 4 | Read Picks Headers | googleSheets | read 'Picks'!1:1 |  |
| 5 | Read Props Headers | googleSheets | read 'Props'!1:1 |  |
| 6 | Read Extraction Log Headers | googleSheets | read 'Extraction Log'!1:1 |  |
| 7 | Read Fight Analysis Headers | googleSheets | read 'Fight Analysis'!1:1 |  |
| 8 | Read Transcripts Headers | googleSheets | read 'Transcripts'!1:1 |  |
| 9 | Read Fight Card Headers | googleSheets | read 'Fight Card'!A:H |  |
| 10 | Read UFC Fight Card State | dataTable | get ufc_fight_card_state |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Prepare Schema Check | 0 |
| Prepare Schema Check | main | 0 | Read Picks Headers | 0 |
| Read Picks Headers | main | 0 | Read Props Headers | 0 |
| Read Props Headers | main | 0 | Read Extraction Log Headers | 0 |
| Read Extraction Log Headers | main | 0 | Read Fight Analysis Headers | 0 |
| Read Fight Analysis Headers | main | 0 | Read Transcripts Headers | 0 |
| Read Transcripts Headers | main | 0 | Read Fight Card Headers | 0 |
| Read Fight Card Headers | main | 0 | Read UFC Fight Card State | 0 |
| Read UFC Fight Card State | main | 0 | Validate Spreadsheet Headers | 0 |

## Code and configuration

- `Prepare Schema Check`: [source](../../source/svc-check-event-spreadsheet/02-prepare-schema-check.js)
- `Validate Spreadsheet Headers`: [source](../../source/svc-check-event-spreadsheet/03-validate-spreadsheet-headers.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
