# UFC | svc.resolve_incident

Mark a selected incident resolved with an owner-supplied resolution.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/XN5zvwsajUldmPgN) · [Sanitized snapshot](../../workflows/svc-resolve-incident.json)

## Identity and version

- Workflow ID: `XN5zvwsajUldmPgN`
- Published: `True`
- Published version: `d18954d6-e5e5-4c6f-bc5f-ed3fe278cc5d`
- Draft version: `d18954d6-e5e5-4c6f-bc5f-ed3fe278cc5d`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 9
- Timezone: `inherits instance timezone; not present in MCP snapshot`

## How it works

1. Accept incident ID/key, resolution and optional fixed_in_version; the router translates /fixed into these fields.
2. Read incidents and require the requested match.
3. Set status=resolved, resolved_by=owner and the resolution/version metadata, then confirm in Telegram unless dry_run.

## Important behavior and limits

This records that a fix was made; it does not deploy a fix or verify all workflows. A recurring condition can reopen an incident.

## Triggers and input contract

```json
[
  {
    "name": "When Called",
    "type": "n8n-nodes-base.executeWorkflowTrigger",
    "parameters": {
      "inputSource": "workflowInputs",
      "workflowInputs": {
        "values": [
          {
            "name": "incident",
            "type": "string"
          },
          {
            "name": "resolution",
            "type": "string"
          },
          {
            "name": "fixed_in_version",
            "type": "string"
          },
          {
            "name": "dry_run",
            "type": "boolean"
          }
        ]
      }
    }
  }
]
```

Passthrough triggers accept caller JSON rather than enforcing a declared field schema. Inspect the linked validation/normalization code and caller mappings for runtime requirements. An omitted schedule field uses its n8n node default; see [schedules](../schedules.md).

## Connections to other workflows

Called by: [UFC | 5. Telegram Command Router](5-telegram-command-router.md) via `Run Resolve Incident`


Configured error handler: `None`. See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read All Incidents | ufc_incidents | get |  |
| Save Resolution | ufc_incidents | update | status, resolved_at, resolution, resolved_by, fixed_in_version |

Terminal nodes in the saved graph: `Return Done`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Read All Incidents | dataTable | get ufc_incidents | alwaysOutputData=True, executeOnce=True |
| 3 | Pick Incident | code | [JavaScript](../../source/svc-resolve-incident/03-pick-incident.js) |  |
| 4 | Save Resolution | dataTable | update ufc_incidents |  |
| 5 | Send Confirmation? | if |  |  |
| 6 | Send Confirmation | telegram | Telegram sendMessage | executeOnce=True |
| 7 | Return Done | code | [JavaScript](../../source/svc-resolve-incident/07-return-done.js) | executeOnce=True |
| 8 | Found? | if |  |  |
| 9 | Send Not Found | telegram | Telegram sendMessage |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Read All Incidents | 0 |
| Read All Incidents | main | 0 | Pick Incident | 0 |
| Save Resolution | main | 0 | Send Confirmation? | 0 |
| Send Confirmation? | main | 0 | Send Confirmation | 0 |
| Send Confirmation? | main | 1 | Return Done | 0 |
| Send Confirmation | main | 0 | Return Done | 0 |
| Pick Incident | main | 0 | Found? | 0 |
| Found? | main | 0 | Save Resolution | 0 |
| Found? | main | 1 | Send Not Found | 0 |
| Send Not Found | main | 0 | Return Done | 0 |

## Code and configuration

- `Pick Incident`: [source](../../source/svc-resolve-incident/03-pick-incident.js)
- `Return Done`: [source](../../source/svc-resolve-incident/07-return-done.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
