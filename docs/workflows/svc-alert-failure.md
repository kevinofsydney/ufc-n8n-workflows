# UFC | svc.alert_failure

Record production workflow failures as incidents, suppress repeat alerts and retry selected transient failures.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/SrL8ScYMIBiJ9Gki) · [Sanitized snapshot](../../workflows/svc-alert-failure.json)

## Identity and version

- Workflow ID: `SrL8ScYMIBiJ9Gki`
- Published: `True`
- Published version: `3261adeb-0d54-4f33-8e10-3171809fc582`
- Draft version: `3261adeb-0d54-4f33-8e10-3171809fc582`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 15
- Timezone: `Australia/Sydney`

## How it works

1. Receive an Error Trigger payload or a supported direct test payload and restrict handling to the UFC allowlist.
2. Format the failed workflow/node/execution link, update applicable run/video state and normalize the error into a stable signature and incident key.
3. Classify transient network/rate-limit/server failures and inspect existing incident rows.
4. For top-level transient failures in capture, analysis or grading, allow one retry after five minutes within the configured six-hour retry window. Integrated sub-workflow failures rely on their caller.
5. Persist the incident; alert on new/reopened failures, failed retries or daily reminders, with recent cross-workflow alert suppression.
6. When selected, wait and rerun the allowed workflow with empty input; otherwise finish after logging/notification.

## Important behavior and limits

Error Triggers concern production execution failures, not every manual test or handled per-item error. The retry re-invokes the worker with empty input, not the original arbitrary request. Alert suppression currently treats any recently alerted sibling incident as a suppression candidate; do not assume it compares signatures across workflows.

## Triggers and input contract

```json
[
  {
    "name": "On UFC Failure",
    "type": "n8n-nodes-base.errorTrigger",
    "parameters": {}
  },
  {
    "name": "When Called",
    "type": "n8n-nodes-base.executeWorkflowTrigger",
    "parameters": {
      "inputSource": "passthrough"
    }
  }
]
```

Passthrough triggers accept caller JSON rather than enforcing a declared field schema. Inspect the linked validation/normalization code and caller mappings for runtime requirements. An omitted schedule field uses its n8n node default; see [schedules](../schedules.md).

## Connections to other workflows

Called by: No static caller in the exported workflows; entry may be scheduled, external, dynamic or error-driven.

- `Retry Failed Workflow` → `={{ $('Decide Incident Action').first().json.retry_workflow_id }}` (dynamic target); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- Dynamic automatic retry dispatch is restricted in code to capture, analysis and grading.

Configured error handler: `None`. See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Record UFC Failed Run | ufc_pipeline_runs | upsert | run_key, workflow_id, workflow_name, state, summary, finished_at, execution_url |
| Mark Interrupted Video Analysis Failed | ufc_videos | update | analysis_status, analysis_error |
| Find Incidents | ufc_incidents | get |  |
| Record Incident | ufc_incidents | upsert | incident_key, source, workflow_id, workflow_name, node_name, category, signature, last_message, status, occurrences, first_seen_at, last_seen_at, last_execution_id, last_execution_url, retry_count, last_retry_at, last_alerted_at, resolved_at, resolution |

Terminal nodes in the saved graph: `Send UFC Failure Alert`, `Record UFC Failed Run`, `Mark Interrupted Video Analysis Failed`, `Retry Failed Workflow`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | On UFC Failure | errorTrigger |  |  |
| 2 | When Called | executeWorkflowTrigger |  |  |
| 3 | Format UFC Failure | code | [JavaScript](../../source/svc-alert-failure/03-format-ufc-failure.js) |  |
| 4 | Send UFC Failure Alert | telegram | Telegram sendMessage | retryOnFail=True, maxTries=3, waitBetweenTries=2000, executeOnce=True |
| 5 | Record UFC Failed Run | dataTable | upsert ufc_pipeline_runs |  |
| 6 | Mark Interrupted Video Analysis Failed | dataTable | update ufc_videos |  |
| 7 | Classify Failure | code | [JavaScript](../../source/svc-alert-failure/07-classify-failure.js) |  |
| 8 | Find Incidents | dataTable | get ufc_incidents | alwaysOutputData=True |
| 9 | Decide Incident Action | code | [JavaScript](../../source/svc-alert-failure/09-decide-incident-action.js) |  |
| 10 | Record Incident | dataTable | upsert ufc_incidents |  |
| 11 | Should Alert? | if |  |  |
| 12 | Should Retry? | if |  |  |
| 13 | Wait Before Retry | wait |  | executeOnce=True |
| 14 | Empty Retry Input | code | [JavaScript](../../source/svc-alert-failure/14-empty-retry-input.js) |  |
| 15 | Retry Failed Workflow | executeWorkflow | ={{ $('Decide Incident Action').first().json.retry_workflow_id }} | onError=continueErrorOutput |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| On UFC Failure | main | 0 | Format UFC Failure | 0 |
| When Called | main | 0 | Format UFC Failure | 0 |
| Format UFC Failure | main | 0 | Record UFC Failed Run | 0 |
| Format UFC Failure | main | 0 | Mark Interrupted Video Analysis Failed | 0 |
| Format UFC Failure | main | 0 | Classify Failure | 0 |
| Classify Failure | main | 0 | Find Incidents | 0 |
| Find Incidents | main | 0 | Decide Incident Action | 0 |
| Decide Incident Action | main | 0 | Record Incident | 0 |
| Record Incident | main | 0 | Should Alert? | 0 |
| Record Incident | main | 0 | Should Retry? | 0 |
| Should Alert? | main | 0 | Send UFC Failure Alert | 0 |
| Should Retry? | main | 0 | Wait Before Retry | 0 |
| Wait Before Retry | main | 0 | Empty Retry Input | 0 |
| Empty Retry Input | main | 0 | Retry Failed Workflow | 0 |

## Code and configuration

- `Format UFC Failure`: [source](../../source/svc-alert-failure/03-format-ufc-failure.js)
- `Classify Failure`: [source](../../source/svc-alert-failure/07-classify-failure.js)
- `Decide Incident Action`: [source](../../source/svc-alert-failure/09-decide-incident-action.js)
- `Empty Retry Input`: [source](../../source/svc-alert-failure/14-empty-retry-input.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
