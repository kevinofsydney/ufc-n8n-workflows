# UFC | 1. Set Active UFC Event (Sunday nights)

Select the next future UFC event and make it the single active event used by capture, analysis and Telegram views.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/mxXosIjmMSiItiYM) · [Sanitized snapshot](../../workflows/1-set-active-ufc-event-sunday-nights.json)

## Identity and version

- Workflow ID: `mxXosIjmMSiItiYM`
- Published: `True`
- Published version: `18398046-30bf-4c1c-8e9c-229485d1faa8`
- Draft version: `18398046-30bf-4c1c-8e9c-229485d1faa8`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 10
- Timezone: `inherits instance timezone; not present in MCP snapshot`

## How it works

1. Read events ordered by event_datetime_local, discard invalid/past dates and choose the nearest future event.
2. If none exists, send a Telegram warning. Otherwise deactivate existing active rows, activate the selected row, and notify the owner.
3. Pass the chosen event to ensure_event_spreadsheet, which also ensures its Fight Card is usable.

## Important behavior and limits

The deactivate/activate sequence is separate writes, not a database transaction. A failure between them can leave no active event; health_sweep detects that. The weekly schedule omits triggerAtDay, whose node default is Sunday.

## Triggers and input contract

```json
[
  {
    "name": "Schedule Trigger",
    "type": "n8n-nodes-base.scheduleTrigger",
    "parameters": {
      "rule": {
        "interval": [
          {
            "field": "weeks",
            "triggerAtHour": 18
          }
        ]
      }
    }
  }
]
```

Passthrough triggers accept caller JSON rather than enforcing a declared field schema. Inspect the linked validation/normalization code and caller mappings for runtime requirements. An omitted schedule field uses its n8n node default; see [schedules](../schedules.md).

## Connections to other workflows

Called by: No static caller in the exported workflows; entry may be scheduled, external, dynamic or error-driven.

- `Ensure UFC Event Spreadsheet` → [UFC | svc.ensure_event_spreadsheet](svc-ensure-event-spreadsheet.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.

Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Retrieve all UFC Events | ufc_events | get |  |
| Deactivate Current UFC Event | ufc_events | update | active |
| Activate Current UFC Event | ufc_events | update | active |

Terminal nodes in the saved graph: `Send a message: event successfully updated`, `Send a message: event failed to update`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | Schedule Trigger | scheduleTrigger |  |  |
| 2 | Retrieve all UFC Events | dataTable | get ufc_events |  |
| 3 | Identify Next UFC Event | code | [JavaScript](../../source/1-set-active-ufc-event-sunday-nights/03-identify-next-ufc-event.js) |  |
| 4 | If | if |  |  |
| 5 | Deactivate Current UFC Event | dataTable | update ufc_events |  |
| 6 | Activate Current UFC Event | dataTable | update ufc_events |  |
| 7 | Send a message: event successfully updated | telegram | Telegram sendMessage |  |
| 8 | Send a message: event failed to update | telegram | Telegram sendMessage |  |
| 9 | Event Ready | set |  |  |
| 10 | Ensure UFC Event Spreadsheet | executeWorkflow | LuALxCWYzByUY2Iq |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| Schedule Trigger | main | 0 | Retrieve all UFC Events | 0 |
| Retrieve all UFC Events | main | 0 | Identify Next UFC Event | 0 |
| Identify Next UFC Event | main | 0 | If | 0 |
| If | main | 0 | Deactivate Current UFC Event | 0 |
| If | main | 1 | Send a message: event failed to update | 0 |
| Deactivate Current UFC Event | main | 0 | Activate Current UFC Event | 0 |
| Activate Current UFC Event | main | 0 | Ensure UFC Event Spreadsheet | 0 |
| Ensure UFC Event Spreadsheet | main | 0 | Event Ready | 0 |
| Event Ready | main | 0 | Send a message: event successfully updated | 0 |

## Code and configuration

- `Identify Next UFC Event`: [source](../../source/1-set-active-ufc-event-sunday-nights/03-identify-next-ufc-event.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
