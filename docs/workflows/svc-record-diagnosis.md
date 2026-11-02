# UFC | svc.record_diagnosis

Persist a diagnosis and send the owner a consistently formatted diagnosis message.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/mOCorio8pJ9qlB8q) · [Sanitized snapshot](../../workflows/svc-record-diagnosis.json)

## Identity and version

- Workflow ID: `mOCorio8pJ9qlB8q`
- Published: `True`
- Published version: `9a2a2636-5888-405c-8691-91939fc21034`
- Draft version: `9a2a2636-5888-405c-8691-91939fc21034`
- Snapshot: 2026-11-02. Published graph matched draft when read.
- Nodes: 9
- Timezone: `Australia/Sydney`

## How it works

1. Load the corresponding incident and validate the structured diagnosis. A missing incident_key, unknown incident, or missing summary/root cause returns ok:false with a reason and retry hint, without writing or messaging.
2. Build escaped summary/evidence/proposed-fix/human-action text and update diagnosis metadata on that incident.
3. Send the fixed-format Telegram message, then return recorded status. Respect the configured dry-run gate.

## Important behavior and limits

Recording a diagnosis does not resolve the incident or apply its proposed fix. Confidence and human_steps describe the investigator's assessment, not verified remediation. Rejections do not throw, so they do not reach the error workflow or create an incident; the caller must read the returned status.

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
            "name": "diagnosed_by",
            "type": "string"
          },
          {
            "name": "summary",
            "type": "string"
          },
          {
            "name": "root_cause",
            "type": "string"
          },
          {
            "name": "evidence",
            "type": "string"
          },
          {
            "name": "affected",
            "type": "string"
          },
          {
            "name": "proposed_fix",
            "type": "string"
          },
          {
            "name": "needs_human",
            "type": "boolean"
          },
          {
            "name": "human_steps",
            "type": "string"
          },
          {
            "name": "confidence",
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

Called by: [UFC | svc.diagnose_incident](svc-diagnose-incident.md) via `Record Diagnosis`


Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read Incident | ufc_incidents | get |  |
| Save Diagnosis | ufc_incidents | update | diagnosis_status, diagnosis_by, diagnosed_at, diagnosis_summary, diagnosis_json |

Terminal nodes in the saved graph: `Return Recorded`, `Return Rejected`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Read Incident | dataTable | get ufc_incidents | alwaysOutputData=True, executeOnce=True |
| 3 | Prepare Diagnosis | code | [JavaScript](../../source/svc-record-diagnosis/03-prepare-diagnosis.js) |  |
| 4 | Save Diagnosis | dataTable | update ufc_incidents |  |
| 5 | Send Diagnosis? | if |  |  |
| 6 | Send Diagnosis | telegram | Telegram sendMessage | executeOnce=True |
| 7 | Return Recorded | code | [JavaScript](../../source/svc-record-diagnosis/07-return-recorded.js) | executeOnce=True |
| 8 | Diagnosis Valid? | if |  |  |
| 9 | Return Rejected | code | [JavaScript](../../source/svc-record-diagnosis/09-return-rejected.js) |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Read Incident | 0 |
| Read Incident | main | 0 | Prepare Diagnosis | 0 |
| Save Diagnosis | main | 0 | Send Diagnosis? | 0 |
| Send Diagnosis? | main | 0 | Send Diagnosis | 0 |
| Send Diagnosis? | main | 1 | Return Recorded | 0 |
| Send Diagnosis | main | 0 | Return Recorded | 0 |
| Prepare Diagnosis | main | 0 | Diagnosis Valid? | 0 |
| Diagnosis Valid? | main | 0 | Save Diagnosis | 0 |
| Diagnosis Valid? | main | 1 | Return Rejected | 0 |

## Code and configuration

- `Prepare Diagnosis`: [source](../../source/svc-record-diagnosis/03-prepare-diagnosis.js)
- `Return Recorded`: [source](../../source/svc-record-diagnosis/07-return-recorded.js)
- `Return Rejected`: [source](../../source/svc-record-diagnosis/09-return-rejected.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
