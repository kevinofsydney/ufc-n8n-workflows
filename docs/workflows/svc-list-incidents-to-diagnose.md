# UFC | svc.list_incidents_to_diagnose

Choose and claim incidents for diagnosis so concurrent diagnosers can coordinate.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/neIv7kEoopd67GLj) · [Sanitized snapshot](../../workflows/svc-list-incidents-to-diagnose.json)

## Identity and version

- Workflow ID: `neIv7kEoopd67GLj`
- Published: `True`
- Published version: `8aabd5af-c46d-44c2-a12e-0d4590900699`
- Draft version: `8aabd5af-c46d-44c2-a12e-0d4590900699`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 7
- Timezone: `Australia/Sydney`

## How it works

1. Validate claimer as agent, workflow or manual and read incidents.
2. Normally choose open, previously alerted, non-test incidents whose diagnosis is missing/stale, respecting optional minimum alert age.
3. Allow at most two diagnosis attempts per opening, treat claims older than 60 minutes as stale, and select up to three incidents.
4. Save in_progress claim metadata unless dry_run, then return compact incident context and claims.

## Important behavior and limits

An explicit incident_key follows a special selection branch and bypasses normal eligibility filtering. Claims are coordination metadata, not a demonstrated transactional compare-and-swap lock; overlapping runs should be monitored.

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
            "name": "claimer",
            "type": "string"
          },
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

Called by: [UFC | svc.diagnose_incident](svc-diagnose-incident.md) via `Pick Incidents`


Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read Incidents | ufc_incidents | get |  |
| Claim Incident | ufc_incidents | update | diagnosis_status, diagnosis_by, diagnosed_at, diagnosis_attempts |

Terminal nodes in the saved graph: `Return Incidents`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Read Incidents | dataTable | get ufc_incidents | alwaysOutputData=True, executeOnce=True |
| 3 | Select Incidents To Diagnose | code | [JavaScript](../../source/svc-list-incidents-to-diagnose/03-select-incidents-to-diagnose.js) |  |
| 4 | Split Claims | code | [JavaScript](../../source/svc-list-incidents-to-diagnose/04-split-claims.js) |  |
| 5 | Any Claims? | if |  |  |
| 6 | Claim Incident | dataTable | update ufc_incidents |  |
| 7 | Return Incidents | code | [JavaScript](../../source/svc-list-incidents-to-diagnose/07-return-incidents.js) | executeOnce=True |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Read Incidents | 0 |
| Read Incidents | main | 0 | Select Incidents To Diagnose | 0 |
| Select Incidents To Diagnose | main | 0 | Split Claims | 0 |
| Split Claims | main | 0 | Any Claims? | 0 |
| Any Claims? | main | 0 | Claim Incident | 0 |
| Any Claims? | main | 1 | Return Incidents | 0 |
| Claim Incident | main | 0 | Return Incidents | 0 |

## Code and configuration

- `Select Incidents To Diagnose`: [source](../../source/svc-list-incidents-to-diagnose/03-select-incidents-to-diagnose.js)
- `Split Claims`: [source](../../source/svc-list-incidents-to-diagnose/04-split-claims.js)
- `Return Incidents`: [source](../../source/svc-list-incidents-to-diagnose/07-return-incidents.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
