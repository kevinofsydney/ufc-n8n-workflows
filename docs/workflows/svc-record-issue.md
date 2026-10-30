# UFC | svc.record_issue

Record an owner-reported issue in the same incident system used for pipeline failures.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/fZB3SuyzKNXurQyI) · [Sanitized snapshot](../../workflows/svc-record-issue.json)

## Identity and version

- Workflow ID: `fZB3SuyzKNXurQyI`
- Published: `True`
- Published version: `3c7b0dde-46d9-45cc-b5b2-ab7901fee52f`
- Draft version: `3c7b0dde-46d9-45cc-b5b2-ab7901fee52f`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 11
- Timezone: `inherits instance timezone; not present in MCP snapshot`

## How it works

1. Accept note and optional severity/workflow/category information from the router or a direct call.
2. Normalize the report, find an already-open equivalent issue and either create it or increment occurrences.
3. Store source=owner, send a confirmation and return the incident key/status, respecting dry_run.

## Important behavior and limits

Owner reports are intentionally protected from the quiet-error auto-resolution service. Use /fixed after resolving them.

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
            "name": "note",
            "type": "string"
          },
          {
            "name": "severity",
            "type": "string"
          },
          {
            "name": "workflow_name",
            "type": "string"
          },
          {
            "name": "workflow_id",
            "type": "string"
          },
          {
            "name": "category",
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

Called by: [UFC | 5. Telegram Command Router](5-telegram-command-router.md) via `Run Record Issue`


Configured error handler: `None`. See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read All Incidents | ufc_incidents | get |  |
| Bump Occurrence | ufc_incidents | update | last_message, owner_note, severity, last_seen_at, occurrences |
| Insert Issue | ufc_incidents | insert | incident_key, source, workflow_id, workflow_name, category, signature, last_message, owner_note, severity, status, occurrences, first_seen_at, last_seen_at, retry_count |

Terminal nodes in the saved graph: `Return Done`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Read All Incidents | dataTable | get ufc_incidents | alwaysOutputData=True, executeOnce=True |
| 3 | Prepare Issue | code | [JavaScript](../../source/svc-record-issue/03-prepare-issue.js) |  |
| 4 | New Or Repeat? | if |  |  |
| 5 | Bump Occurrence | dataTable | update ufc_incidents |  |
| 6 | Build Confirmation | code | [JavaScript](../../source/svc-record-issue/06-build-confirmation.js) | executeOnce=True |
| 7 | Insert Issue | dataTable | insert ufc_incidents |  |
| 8 | Send Confirmation? | if |  |  |
| 9 | Send Confirmation | telegram | Telegram sendMessage | executeOnce=True |
| 10 | Return Done | code | [JavaScript](../../source/svc-record-issue/10-return-done.js) | executeOnce=True |
| 11 | Writes Enabled? | if |  |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Read All Incidents | 0 |
| Read All Incidents | main | 0 | Prepare Issue | 0 |
| New Or Repeat? | main | 0 | Bump Occurrence | 0 |
| New Or Repeat? | main | 1 | Insert Issue | 0 |
| Bump Occurrence | main | 0 | Build Confirmation | 0 |
| Build Confirmation | main | 0 | Send Confirmation? | 0 |
| Insert Issue | main | 0 | Build Confirmation | 0 |
| Send Confirmation? | main | 0 | Send Confirmation | 0 |
| Send Confirmation? | main | 1 | Return Done | 0 |
| Send Confirmation | main | 0 | Return Done | 0 |
| Prepare Issue | main | 0 | Writes Enabled? | 0 |
| Writes Enabled? | main | 0 | New Or Repeat? | 0 |
| Writes Enabled? | main | 1 | Build Confirmation | 0 |

## Code and configuration

- `Prepare Issue`: [source](../../source/svc-record-issue/03-prepare-issue.js)
- `Build Confirmation`: [source](../../source/svc-record-issue/06-build-confirmation.js)
- `Return Done`: [source](../../source/svc-record-issue/10-return-done.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
