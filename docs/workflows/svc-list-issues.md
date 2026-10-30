# UFC | svc.list_issues

Send a readable list of open and recently resolved incidents.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/SkWzi2pqLtbW4HNN) · [Sanitized snapshot](../../workflows/svc-list-issues.json)

## Identity and version

- Workflow ID: `SkWzi2pqLtbW4HNN`
- Published: `True`
- Published version: `d41633b2-ea13-4ec7-b9f5-7b1dfea8a52c`
- Draft version: `d41633b2-ea13-4ec7-b9f5-7b1dfea8a52c`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 5
- Timezone: `inherits instance timezone; not present in MCP snapshot`

## How it works

1. Read ufc_incidents and build an escaped issue list.
2. Show open incidents oldest first and include records resolved in the last seven days.
3. Send the Telegram response unless dry_run and return summary metadata.

## Important behavior and limits

This is a view of the incident ledger; it neither diagnoses nor closes issues.

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

Called by: [UFC | 5. Telegram Command Router](5-telegram-command-router.md) via `Run List Issues`


Configured error handler: `None`. See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read All Incidents | ufc_incidents | get |  |

Terminal nodes in the saved graph: `Return Summary`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Read All Incidents | dataTable | get ufc_incidents | alwaysOutputData=True, executeOnce=True |
| 3 | Build Issue List | code | [JavaScript](../../source/svc-list-issues/03-build-issue-list.js) | executeOnce=True |
| 4 | Send Issue List | telegram | Telegram sendMessage | executeOnce=True |
| 5 | Return Summary | code | [JavaScript](../../source/svc-list-issues/05-return-summary.js) | executeOnce=True |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Read All Incidents | 0 |
| Read All Incidents | main | 0 | Build Issue List | 0 |
| Build Issue List | main | 0 | Send Issue List | 0 |
| Send Issue List | main | 0 | Return Summary | 0 |

## Code and configuration

- `Build Issue List`: [source](../../source/svc-list-issues/03-build-issue-list.js)
- `Return Summary`: [source](../../source/svc-list-issues/05-return-summary.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
