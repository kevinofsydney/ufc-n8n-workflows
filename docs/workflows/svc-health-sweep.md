# UFC | svc.health_sweep

Detect silent pipeline problems and maintain health incidents every 30 minutes.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/oC1PuXuYb1pdeO0J) · [Sanitized snapshot](../../workflows/svc-health-sweep.json)

## Identity and version

- Workflow ID: `oC1PuXuYb1pdeO0J`
- Published: `True`
- Published version: `6e12f3be-467e-434e-a818-4994158e8dff`
- Draft version: `6e12f3be-467e-434e-a818-4994158e8dff`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 14
- Timezone: `Australia/Sydney`

## How it works

1. Read events, videos, Fight Card state, pipeline runs and incidents.
2. Check capture/analysis run gaps over 38 hours, running ledger entries older than two hours, and whether exactly one event is active.
3. Check missing event spreadsheets, cards not READY/PRESERVED within five days of start, NEEDS_REVIEW card changes and changes pending more than 24 hours.
4. Check active-event videos PROCESSING over three hours and CARD_CHANGED re-analysis waiting over 13 hours.
5. Upsert health incidents, send new/reopened or daily reminder alerts and resolve health conditions that clear. Resolve suitable error incidents when later success/idle evidence exists; retrying incidents use the configured 45-minute no-further-failure rule.
6. Dispatch diagnose_incident without waiting to investigate eligible incidents.

## Important behavior and limits

Thresholds intentionally differ from worker retry thresholds. The sweep reads the application's ledger rather than independently proving every n8n execution completed. Its retry-resolution rule infers success from no further failure, so read the recorded evidence.

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
  },
  {
    "name": "Run Sweep",
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

- `Diagnose Unhandled Incidents` → [UFC | svc.diagnose_incident](svc-diagnose-incident.md); waitForSubWorkflow=`False`; node type `n8n-nodes-base.executeWorkflow`.

Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read Pipeline Runs | ufc_pipeline_runs | get |  |
| Read Events | ufc_events | get |  |
| Read Card States | ufc_fight_card_state | get |  |
| Read Videos | ufc_videos | get |  |
| Read Incidents | ufc_incidents | get |  |
| Record Health Incident | ufc_incidents | upsert | incident_key, source, workflow_id, workflow_name, node_name, category, signature, last_message, status, occurrences, first_seen_at, last_seen_at, last_execution_id, last_execution_url, retry_count, last_retry_at, last_alerted_at, resolved_at, resolution |

Terminal nodes in the saved graph: `Record Health Incident`, `Send Health Alert`, `Diagnose Unhandled Incidents`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | Every 30 Minutes | scheduleTrigger |  |  |
| 2 | Run Sweep | executeWorkflowTrigger |  |  |
| 3 | Read Pipeline Runs | dataTable | get ufc_pipeline_runs | alwaysOutputData=True, executeOnce=True |
| 4 | Read Events | dataTable | get ufc_events | alwaysOutputData=True, executeOnce=True |
| 5 | Read Card States | dataTable | get ufc_fight_card_state | alwaysOutputData=True, executeOnce=True |
| 6 | Read Videos | dataTable | get ufc_videos | alwaysOutputData=True, executeOnce=True |
| 7 | Read Incidents | dataTable | get ufc_incidents | alwaysOutputData=True, executeOnce=True |
| 8 | Sweep Pipeline Health | code | [JavaScript](../../source/svc-health-sweep/08-sweep-pipeline-health.js) |  |
| 9 | Split Incident Updates | code | [JavaScript](../../source/svc-health-sweep/09-split-incident-updates.js) |  |
| 10 | Any Updates? | if |  |  |
| 11 | Record Health Incident | dataTable | upsert ufc_incidents |  |
| 12 | Send Health Alert? | if |  |  |
| 13 | Send Health Alert | telegram | Telegram sendMessage |  |
| 14 | Diagnose Unhandled Incidents | executeWorkflow | UB711gFJFn9OuZwb | onError=continueRegularOutput, executeOnce=True |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| Every 30 Minutes | main | 0 | Read Pipeline Runs | 0 |
| Run Sweep | main | 0 | Read Pipeline Runs | 0 |
| Read Pipeline Runs | main | 0 | Read Events | 0 |
| Read Events | main | 0 | Read Card States | 0 |
| Read Card States | main | 0 | Read Videos | 0 |
| Read Videos | main | 0 | Read Incidents | 0 |
| Read Incidents | main | 0 | Sweep Pipeline Health | 0 |
| Sweep Pipeline Health | main | 0 | Split Incident Updates | 0 |
| Sweep Pipeline Health | main | 0 | Send Health Alert? | 0 |
| Sweep Pipeline Health | main | 0 | Diagnose Unhandled Incidents | 0 |
| Split Incident Updates | main | 0 | Any Updates? | 0 |
| Any Updates? | main | 0 | Record Health Incident | 0 |
| Send Health Alert? | main | 0 | Send Health Alert | 0 |

## Code and configuration

- `Sweep Pipeline Health`: [source](../../source/svc-health-sweep/08-sweep-pipeline-health.js)
- `Split Incident Updates`: [source](../../source/svc-health-sweep/09-split-incident-updates.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
