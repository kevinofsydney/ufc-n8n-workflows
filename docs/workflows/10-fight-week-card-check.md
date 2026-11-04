# UFC | 10. Fight-Week Card Check

Check and apply fight-card changes every two hours in the 72 hours before the active event.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/ID44VEOFRj2lKTuv) · [Sanitized snapshot](../../workflows/10-fight-week-card-check.json)

## Identity and version

- Workflow ID: `ID44VEOFRj2lKTuv`
- Published: `True`
- Published version: `3569124a-bab0-4ddc-b43d-aa3f74e1261b`
- Draft version: `3569124a-bab0-4ddc-b43d-aa3f74e1261b`
- Snapshot: 2026-11-05. Published graph matched draft when read.
- Nodes: 10
- Timezone: `inherits instance timezone; not present in MCP snapshot`

## How it works

1. Every two hours, read the active event and any analysis run still marked running.
2. Continue only for exactly one active event whose main card starts within 72 hours and has not started, and when no analysis run started in the last hour is still running.
3. Ensure the event spreadsheet and Fight Card, then for a READY or PRESERVED card run svc.detect_card_changes, svc.apply_card_changes and svc.sync_bout_ids, exactly as analysis does.

## Important behavior and limits

Analysis checks the card only one to three times a day, and a removal needs two checks in a row, so a last-minute change could take most of a day to land. This workflow makes those checks two hours apart in fight week. It writes nothing itself; the card services do, and they send the card-update Telegram message. Detect and apply failures raise their own incidents and stop the run; a sync failure fails the run.

## Triggers and input contract

```json
[
  {
    "name": "Every 2 Hours",
    "type": "n8n-nodes-base.scheduleTrigger",
    "parameters": {
      "rule": {
        "interval": [
          {
            "field": "hours",
            "hoursInterval": 2,
            "triggerAtMinute": 5
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

- `Ensure UFC Fight Card` → [UFC | svc.ensure_event_spreadsheet](svc-ensure-event-spreadsheet.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Detect Card Changes` → [UFC | svc.detect_card_changes](svc-detect-card-changes.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Apply Card Changes` → [UFC | svc.apply_card_changes](svc-apply-card-changes.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Sync Bout IDs` → [UFC | svc.sync_bout_ids](svc-sync-bout-ids.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.

Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Get Active UFC Event | ufc_events | get |  |
| Get Running Analysis | ufc_pipeline_runs | get |  |

Terminal nodes in the saved graph: `Sync Bout IDs`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | Every 2 Hours | scheduleTrigger |  |  |
| 2 | Get Active UFC Event | dataTable | get ufc_events | executeOnce=True |
| 3 | Get Running Analysis | dataTable | get ufc_pipeline_runs | alwaysOutputData=True, executeOnce=True |
| 4 | Fight Week Only | code | [JavaScript](../../source/10-fight-week-card-check/04-fight-week-only.js) |  |
| 5 | Ensure UFC Fight Card | executeWorkflow | LuALxCWYzByUY2Iq |  |
| 6 | Fight Card Ready? | if |  |  |
| 7 | Detect Card Changes | executeWorkflow | UDRrGRyeFPL9Lk3S | onError=continueErrorOutput |
| 8 | Apply Card Changes | executeWorkflow | jWFGMw2faC2zLseh | onError=continueErrorOutput |
| 9 | Sync Bout IDs | executeWorkflow | ya1uS9XFsrlhq6e3 |  |
| 10 | Sticky Note 2bc237c7 | stickyNote |  |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| Every 2 Hours | main | 0 | Get Active UFC Event | 0 |
| Get Active UFC Event | main | 0 | Get Running Analysis | 0 |
| Get Running Analysis | main | 0 | Fight Week Only | 0 |
| Fight Week Only | main | 0 | Ensure UFC Fight Card | 0 |
| Ensure UFC Fight Card | main | 0 | Fight Card Ready? | 0 |
| Fight Card Ready? | main | 0 | Detect Card Changes | 0 |
| Detect Card Changes | main | 0 | Apply Card Changes | 0 |
| Apply Card Changes | main | 0 | Sync Bout IDs | 0 |

## Code and configuration

- `Fight Week Only`: [source](../../source/10-fight-week-card-check/04-fight-week-only.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
