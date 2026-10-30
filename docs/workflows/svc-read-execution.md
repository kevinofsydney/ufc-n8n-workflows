# UFC | svc.read_execution

Return compact read-only execution evidence for diagnosers.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/pHQCLT93NxqScBgQ) · [Sanitized snapshot](../../workflows/svc-read-execution.json)

## Identity and version

- Workflow ID: `pHQCLT93NxqScBgQ`
- Published: `True`
- Published version: `b6a49a90-8732-4966-af9d-108e01dc45c1`
- Draft version: `b6a49a90-8732-4966-af9d-108e01dc45c1`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 3
- Timezone: `Australia/Sydney`

## How it works

1. Accept workflow_id, execution_id, optional comma-separated node_names and max_chars.
2. Read execution data through the authenticated n8n MCP HTTP endpoint.
3. Trim large strings and samples, retain counts/error/failing-node context and return the compact summary.

## Important behavior and limits

This keeps giant HTML pages/transcripts out of diagnostic context. It does not execute or modify the workflow. Limits/truncation mean the summary is evidence, not a complete execution archive.

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
            "name": "workflow_id",
            "type": "string"
          },
          {
            "name": "execution_id",
            "type": "string"
          },
          {
            "name": "node_names",
            "type": "string"
          },
          {
            "name": "max_chars",
            "type": "number"
          }
        ]
      }
    }
  }
]
```

Passthrough triggers accept caller JSON rather than enforcing a declared field schema. Inspect the linked validation/normalization code and caller mappings for runtime requirements. An omitted schedule field uses its n8n node default; see [schedules](../schedules.md).

## Connections to other workflows

Called by: [UFC | svc.diagnose_incident](svc-diagnose-incident.md) via `read_execution`


Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

No direct n8n data-table access. External services, sheets or called workflows may still read/write data.

Terminal nodes in the saved graph: `Summarise Execution`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Read Execution From n8n | httpRequest | https://N8N_INSTANCE.example/mcp-server/http |  |
| 3 | Summarise Execution | code | [JavaScript](../../source/svc-read-execution/03-summarise-execution.js) |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Read Execution From n8n | 0 |
| Read Execution From n8n | main | 0 | Summarise Execution | 0 |

## Code and configuration

- `Summarise Execution`: [source](../../source/svc-read-execution/03-summarise-execution.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
