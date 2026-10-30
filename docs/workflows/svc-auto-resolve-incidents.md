# UFC | svc.auto_resolve_incidents

Close quiet error incidents on a time-based rule.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/gfR9qKH6xCTJXzcg) · [Sanitized snapshot](../../workflows/svc-auto-resolve-incidents.json)

## Identity and version

- Workflow ID: `gfR9qKH6xCTJXzcg`
- Published: `True`
- Published version: `e48d373f-40e7-4f96-99fb-5d46bdf80dc7`
- Draft version: `e48d373f-40e7-4f96-99fb-5d46bdf80dc7`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 6
- Timezone: `inherits instance timezone; not present in MCP snapshot`

## How it works

1. Every 30 minutes, read incidents and select unresolved error-sourced records with no recurrence for 12 hours.
2. Exclude owner-reported and test incidents.
3. Set selected incidents resolved with a quiet-period explanation and send a compact Telegram summary.

## Important behavior and limits

Time-based closure means no recurrence was observed; it does not prove a code fix. health_sweep separately owns positive-evidence and health-condition resolution.

## Triggers and input contract

```json
[
  {
    "name": "Every 30 Minutes",
    "type": "n8n-nodes-base.scheduleTrigger",
    "parameters": {
      "rule": {
        "interval": [
          {
            "field": "minutes",
            "minutesInterval": 30
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


Configured error handler: `None`. See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read All Incidents | ufc_incidents | get |  |
| Close Stale Incident | ufc_incidents | update | status, resolved_at, resolution, resolved_by |

Terminal nodes in the saved graph: `Send Summary`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | Every 30 Minutes | scheduleTrigger |  |  |
| 2 | Read All Incidents | dataTable | get ufc_incidents | alwaysOutputData=True, executeOnce=True |
| 3 | Select Stale Incidents | code | [JavaScript](../../source/svc-auto-resolve-incidents/03-select-stale-incidents.js) | executeOnce=True |
| 4 | Close Stale Incident | dataTable | update ufc_incidents |  |
| 5 | Build Summary | code | [JavaScript](../../source/svc-auto-resolve-incidents/05-build-summary.js) | executeOnce=True |
| 6 | Send Summary | telegram | Telegram sendMessage | executeOnce=True |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| Every 30 Minutes | main | 0 | Read All Incidents | 0 |
| Read All Incidents | main | 0 | Select Stale Incidents | 0 |
| Select Stale Incidents | main | 0 | Close Stale Incident | 0 |
| Close Stale Incident | main | 0 | Build Summary | 0 |
| Build Summary | main | 0 | Send Summary | 0 |

## Code and configuration

- `Select Stale Incidents`: [source](../../source/svc-auto-resolve-incidents/03-select-stale-incidents.js)
- `Build Summary`: [source](../../source/svc-auto-resolve-incidents/05-build-summary.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
