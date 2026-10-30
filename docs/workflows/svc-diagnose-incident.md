# UFC | svc.diagnose_incident

Investigate eligible incidents using a bounded AI diagnosis workflow and save the findings.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/UB711gFJFn9OuZwb) · [Sanitized snapshot](../../workflows/svc-diagnose-incident.json)

## Identity and version

- Workflow ID: `UB711gFJFn9OuZwb`
- Published: `True`
- Published version: `d0256f3b-b428-468d-82b8-cb2876d5aa32`
- Draft version: `d0256f3b-b428-468d-82b8-cb2876d5aa32`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 12
- Timezone: `Australia/Sydney`

## How it works

1. Call list_incidents_to_diagnose and split the returned incidents.
2. Run the Diagnose Incident AI Agent node with DeepSeek V4.1 Flash through OpenRouter and a structured output parser.
3. Use configured n8n read-only MCP tools, compact read_execution, public page fetching and Exa search to gather evidence.
4. Collect summary, root cause, evidence, affected resources, proposed fix, human steps and confidence.
5. Call record_diagnosis to persist the result and send the escaped Telegram diagnosis.

## Important behavior and limits

This is a workflow containing an AI Agent node, not an export of a separate first-class n8n Agent. The prompt forbids remediation; attached investigation tools are intended to be read-only. Claims and diagnosis recording do write incident metadata. The model node allows 25 iterations even though the prompt advises about 15 tool calls.

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
            "name": "incident_key",
            "type": "string"
          },
          {
            "name": "older_than_minutes",
            "type": "number"
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

Called by: [UFC | svc.health_sweep](svc-health-sweep.md) via `Diagnose Unhandled Incidents`

- `Pick Incidents` → [UFC | svc.list_incidents_to_diagnose](svc-list-incidents-to-diagnose.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Record Diagnosis` → [UFC | svc.record_diagnosis](svc-record-diagnosis.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `read_execution` → [UFC | svc.read_execution](svc-read-execution.md); waitForSubWorkflow=`default`; node type `@n8n/n8n-nodes-langchain.toolWorkflow`.

Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

No direct n8n data-table access. External services, sheets or called workflows may still read/write data.

Terminal nodes in the saved graph: `Record Diagnosis`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Pick Incidents | executeWorkflow | neIv7kEoopd67GLj |  |
| 3 | One Item Per Incident | code | [JavaScript](../../source/svc-diagnose-incident/03-one-item-per-incident.js) |  |
| 4 | Diagnose Incident | agent |  | onError=continueRegularOutput |
| 5 | DeepSeek Flash (OpenRouter) | lmChatOpenRouter |  |  |
| 6 | n8n read-only tools | mcpClientTool |  |  |
| 7 | exa_search | httpRequestTool | https://api.exa.ai/search |  |
| 8 | fetch_page | httpRequestTool | ={{ $fromAI("url", "Full https URL to fetch", "string") }} |  |
| 9 | Diagnosis Format | outputParserStructured |  |  |
| 10 | Collect Diagnosis | code | [JavaScript](../../source/svc-diagnose-incident/10-collect-diagnosis.js) |  |
| 11 | Record Diagnosis | executeWorkflow | mOCorio8pJ9qlB8q |  |
| 12 | read_execution | toolWorkflow | pHQCLT93NxqScBgQ |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Pick Incidents | 0 |
| Pick Incidents | main | 0 | One Item Per Incident | 0 |
| One Item Per Incident | main | 0 | Diagnose Incident | 0 |
| Diagnose Incident | main | 0 | Collect Diagnosis | 0 |
| n8n read-only tools | ai_tool | 0 | Diagnose Incident | 0 |
| exa_search | ai_tool | 0 | Diagnose Incident | 0 |
| fetch_page | ai_tool | 0 | Diagnose Incident | 0 |
| Diagnosis Format | ai_outputParser | 0 | Diagnose Incident | 0 |
| Collect Diagnosis | main | 0 | Record Diagnosis | 0 |
| DeepSeek Flash (OpenRouter) | ai_languageModel | 0 | Diagnose Incident | 0 |
| read_execution | ai_tool | 0 | Diagnose Incident | 0 |

## Code and configuration

- `One Item Per Incident`: [source](../../source/svc-diagnose-incident/03-one-item-per-incident.js)
- `Collect Diagnosis`: [source](../../source/svc-diagnose-incident/10-collect-diagnosis.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
