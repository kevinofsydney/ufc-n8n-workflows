# Monitoring and incident handling

## Explicit errors versus silent failures

The shared `svc.alert_failure` workflow is configured as the Error Trigger handler for the workflows that reference it in settings. It handles production errors; a manual test or an error deliberately continued on a node output may not invoke it. Those are separate from the application-level capture/analysis run ledger.

Capture explicitly reports API channel failures, even when n8n can finish the execution. Empty scans finish as idle, with an explicit Telegram message. `svc.health_sweep` checks stored state every 30 minutes for conditions that otherwise might not throw an exception.

## Failure handler policy

The handler restricts processing to an allowed UFC workflow list, normalizes an error signature, tracks recurrence and writes an incident. For transient failures in top-level capture, analysis and grading, it can retry once after five minutes. A failed retry alerts. It limits this retry within a six-hour window and normally lets an integrated child failure be handled by the caller.

New or reopened incidents alert; continuing incidents ordinarily remind at most once per day. The code also suppresses alerts when it finds a sibling incident alerted in the last 15 minutes. **The current sibling lookup does not compare signatures**, despite the broader intent described in its comments. Distinct nearby errors can therefore be coalesced in notifications. This is documented behavior, not a change made by this documentation task.

Automatic retry starts the selected worker with empty input. It is not guaranteed to recreate the exact original manual target or request. Inspect the worker's subsequent ledger entry rather than treating “retrying” as success.

## Health thresholds

| Condition | Threshold or rule |
| --- | --- |
| Missing capture/analysis runs | No recorded run, or latest run older than 38 hours |
| Stuck pipeline ledger | Latest running entry older than two hours |
| Active event count | Must be exactly one |
| Missing event spreadsheet | Invalid/empty spreadsheet ID |
| Card not ready | Within five days before start and card state not READY/PRESERVED |
| Card review required | change_status is NEEDS_REVIEW |
| Card changes waiting | CHANGED/PARTLY_APPLIED for more than 24 hours before start |
| Stuck video | analysis_status PROCESSING for more than three hours |
| Re-analysis waiting | CARD_CHANGED for more than 13 hours |
| Health reminder | New/reopened condition, or at least 24 hours since alert |

The sweep resolves health incidents when their condition clears. It can close error incidents if a later ledger run of the same workflow is success/idle. For retrying incidents it currently uses more than 45 minutes without another failure as recovery evidence. That inference is weaker than inspecting a specific successful retry execution.

`svc.auto_resolve_incidents` separately closes error-sourced incidents after 12 quiet hours. It excludes owner-reported and test incidents. A quiet-period resolution means no recurrence was observed; it does not establish a deployed fix.

## Diagnosis flow

`svc.list_incidents_to_diagnose` selects up to three eligible incidents and records claims. Normal eligibility requires an open, alerted, non-test incident with no current diagnosis, no fresh claim and fewer than two attempts for the current opening. Claims become stale after 60 minutes. An explicit incident_key takes a special branch that bypasses the normal eligibility filters. The claim writes are coordination metadata, not a proven atomic global lock.

`svc.diagnose_incident` contains an AI Agent node and a structured parser. It uses `deepseek/deepseek-v4.1-flash-1017` via OpenRouter. Its attached n8n MCP tool allowlist is:

- search_workflows, get_workflow_details, get_workflow_history, get_workflow_version, get_workflow_versions_diff
- search_workflow_executions, get_instance_activity, expand_instance_activity
- search_data_tables, get_data_table_rows, get_node_types

The separate `read_execution` tool calls `svc.read_execution`, which trims output instead of loading giant page/transcript bodies into the model. Exa search and a bounded public fetch tool provide external evidence. The agent prompt treats fetched material as untrusted and forbids changing, executing or publishing workflows. The configured Agent node permits 25 iterations; the prompt recommends about 15 investigation calls.

`svc.record_diagnosis` validates and saves the summary, root cause, evidence, affected resources, proposed fix, confidence and human steps. It sends a fixed escaped Telegram message. This writes diagnosis metadata but does not implement the fix or mark the incident resolved.

Separate first-class n8n Agent artifacts are not included in the workflow export. The claim service recognizes `agent` as a possible claimer, but that alone does not prove another Agent is currently active or configured.

## Owner actions

Use `/issues` to inspect open and recently resolved records, `/issue TEXT` to record a manual issue, and `/fixed ID explanation` to record a resolution. Owner issues are protected from quiet-error auto-closure. Include the actual fix/version in the note when available. Recurrent conditions can reopen an incident.

Credit monitoring is separate: workflow 9 checks at 09:00/21:00 Australia/Sydney, stores the available OpenRouter balance source and uses a default USD 5 threshold. Successful alert delivery updates last_alerted_at. An unavailable account-credit endpoint can fall back to key information; do not interpret that as the entire account balance.
