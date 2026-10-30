# UFC | svc.ensure_event_spreadsheet

Return a valid event spreadsheet, reusing an existing copy before creating a new one.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/LuALxCWYzByUY2Iq) · [Sanitized snapshot](../../workflows/svc-ensure-event-spreadsheet.json)

## Identity and version

- Workflow ID: `LuALxCWYzByUY2Iq`
- Published: `True`
- Published version: `d48fa5ee-96ed-47cb-a0fc-8532a2d3b07a`
- Draft version: `d48fa5ee-96ed-47cb-a0fc-8532a2d3b07a`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 13
- Timezone: `Australia/Sydney`

## How it works

1. Validate one event request and load the canonical stored ufc_events row.
2. Reuse a saved spreadsheet ID, otherwise search the configured Drive destination for an existing event copy.
3. If no copy exists, copy the transcript template, construct the spreadsheet details and save its ID and URL on the event.
4. Call populate_fight_card and return the ready event with card metadata.

## Important behavior and limits

This is a shared prerequisite used by activation, capture and analysis. Reuse/search reduces duplicate spreadsheets but is not a global creation lock. Google Drive and Sheets credentials need access to the template, folder and event files.

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

Called by: [UFC | 3. Analyse Picker Video Transcripts](3-analyse-picker-video-transcripts.md) via `Ensure UFC Fight Card`, [UFC | 1. Set Active UFC Event (Sunday nights)](1-set-active-ufc-event-sunday-nights.md) via `Ensure UFC Event Spreadsheet`, [UFC | 2. Extract Picker Video Transcripts](2-extract-picker-video-transcripts.md) via `Ensure UFC Event Spreadsheet`

- `Populate Empty UFC Fight Card` → [UFC | svc.populate_fight_card](svc-populate-fight-card.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.

Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read UFC Event | ufc_events | get |  |
| Save UFC Spreadsheet | ufc_events | update | spreadsheet_id, spreadsheet_url |

Terminal nodes in the saved graph: `Populate Empty UFC Fight Card`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Validate Event Request | code | [JavaScript](../../source/svc-ensure-event-spreadsheet/02-validate-event-request.js) |  |
| 3 | Read UFC Event | dataTable | get ufc_events | alwaysOutputData=True |
| 4 | Validate Stored Event | code | [JavaScript](../../source/svc-ensure-event-spreadsheet/04-validate-stored-event.js) |  |
| 5 | Spreadsheet Already Saved? | if |  |  |
| 6 | Find Existing UFC Spreadsheet | googleDrive | search | retryOnFail=True, maxTries=3, waitBetweenTries=5000, alwaysOutputData=True |
| 7 | Select Existing Copy | code | [JavaScript](../../source/svc-ensure-event-spreadsheet/07-select-existing-copy.js) |  |
| 8 | Existing Copy Found? | if |  |  |
| 9 | Copy UFC Transcript Template | googleDrive | copy | retryOnFail=True, maxTries=3, waitBetweenTries=5000 |
| 10 | Prepare UFC Spreadsheet Details | code | [JavaScript](../../source/svc-ensure-event-spreadsheet/10-prepare-ufc-spreadsheet-details.js) |  |
| 11 | Save UFC Spreadsheet | dataTable | update ufc_events | alwaysOutputData=True |
| 12 | UFC Event Ready | code | [JavaScript](../../source/svc-ensure-event-spreadsheet/12-ufc-event-ready.js) |  |
| 13 | Populate Empty UFC Fight Card | executeWorkflow | SBBK0hOGx2uPYpm4 |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Validate Event Request | 0 |
| Validate Event Request | main | 0 | Read UFC Event | 0 |
| Read UFC Event | main | 0 | Validate Stored Event | 0 |
| Validate Stored Event | main | 0 | Spreadsheet Already Saved? | 0 |
| Spreadsheet Already Saved? | main | 0 | UFC Event Ready | 0 |
| Spreadsheet Already Saved? | main | 1 | Find Existing UFC Spreadsheet | 0 |
| Find Existing UFC Spreadsheet | main | 0 | Select Existing Copy | 0 |
| Select Existing Copy | main | 0 | Existing Copy Found? | 0 |
| Existing Copy Found? | main | 0 | Prepare UFC Spreadsheet Details | 0 |
| Existing Copy Found? | main | 1 | Copy UFC Transcript Template | 0 |
| Copy UFC Transcript Template | main | 0 | Prepare UFC Spreadsheet Details | 0 |
| Prepare UFC Spreadsheet Details | main | 0 | Save UFC Spreadsheet | 0 |
| Save UFC Spreadsheet | main | 0 | UFC Event Ready | 0 |
| UFC Event Ready | main | 0 | Populate Empty UFC Fight Card | 0 |

## Code and configuration

- `Validate Event Request`: [source](../../source/svc-ensure-event-spreadsheet/02-validate-event-request.js)
- `Validate Stored Event`: [source](../../source/svc-ensure-event-spreadsheet/04-validate-stored-event.js)
- `Select Existing Copy`: [source](../../source/svc-ensure-event-spreadsheet/07-select-existing-copy.js)
- `Prepare UFC Spreadsheet Details`: [source](../../source/svc-ensure-event-spreadsheet/10-prepare-ufc-spreadsheet-details.js)
- `UFC Event Ready`: [source](../../source/svc-ensure-event-spreadsheet/12-ufc-event-ready.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
