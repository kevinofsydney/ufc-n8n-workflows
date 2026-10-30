# UFC | svc.retry_video

Accept a targeted owner retry for one unfinished active-event video.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/G1EMMFVSzpGE4q3Q) · [Sanitized snapshot](../../workflows/svc-retry-video.json)

## Identity and version

- Workflow ID: `G1EMMFVSzpGE4q3Q`
- Published: `True`
- Published version: `fe8f4023-b2ea-4890-bc97-bf172c246784`
- Draft version: `fe8f4023-b2ea-4890-bc97-bf172c246784`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 12
- Timezone: `Australia/Sydney`

## How it works

1. Parse /retry [capture|analyse] VIDEO_ID or a supported YouTube watch URL and require the owner chat.
2. Require exactly one active event and one matching video row, with an unambiguous title match.
3. Enforce a five-minute request gap; auto-select capture if no transcript exists or analysis if it does.
4. Reject already captured capture requests, completed analyses and recently PROCESSING analyses. Save RETRY_REQUESTED metadata without resetting attempt counters.
5. Dispatch only the selected capture/analysis worker with manual_retry, target_video_id and the saved row, without waiting for worker completion.

## Important behavior and limits

Manual targeting can permit work beyond automatic retry caps; it is deliberate, not a counter reset. The immediate retry reply is a queued acknowledgement. Worker completion reporting remains separate.

## Triggers and input contract

```json
[
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

Called by: [UFC | 5. Telegram Command Router](5-telegram-command-router.md) via `Run Video Retry`

- `Run Requested Video Worker` → `={{ $json.dispatch_workflow_id }}` (dynamic target); waitForSubWorkflow=`False`; node type `n8n-nodes-base.executeWorkflow`.
- Dynamic retry dispatch selects capture or analysis from the validated request.

Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read Known UFC Events | ufc_events | get |  |
| Read Requested UFC Video | ufc_videos | get |  |
| Save Retry Request | ufc_videos | update | status, analysis_status, retry_requested_at, retry_stage |

Terminal nodes in the saved graph: `Run Requested Video Worker`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Parse Retry Request | code | [JavaScript](../../source/svc-retry-video/02-parse-retry-request.js) |  |
| 3 | Retry Request Valid? | if |  |  |
| 4 | Read Known UFC Events | dataTable | get ufc_events | alwaysOutputData=True, executeOnce=True |
| 5 | Read Requested UFC Video | dataTable | get ufc_videos | alwaysOutputData=True, executeOnce=True |
| 6 | Validate Video Retry | code | [JavaScript](../../source/svc-retry-video/06-validate-video-retry.js) |  |
| 7 | Retry Accepted? | if |  |  |
| 8 | Save Retry Request | dataTable | update ufc_videos | alwaysOutputData=True, executeOnce=True |
| 9 | Prepare Retry Dispatch | code | [JavaScript](../../source/svc-retry-video/09-prepare-retry-dispatch.js) |  |
| 10 | Send Retry Reply | telegram | Telegram sendMessage |  |
| 11 | Dispatch Accepted Retry | code | [JavaScript](../../source/svc-retry-video/11-dispatch-accepted-retry.js) |  |
| 12 | Run Requested Video Worker | executeWorkflow | ={{ $json.dispatch_workflow_id }} |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Parse Retry Request | 0 |
| Parse Retry Request | main | 0 | Retry Request Valid? | 0 |
| Retry Request Valid? | main | 0 | Read Known UFC Events | 0 |
| Retry Request Valid? | main | 1 | Send Retry Reply | 0 |
| Read Known UFC Events | main | 0 | Read Requested UFC Video | 0 |
| Read Requested UFC Video | main | 0 | Validate Video Retry | 0 |
| Validate Video Retry | main | 0 | Retry Accepted? | 0 |
| Retry Accepted? | main | 0 | Save Retry Request | 0 |
| Retry Accepted? | main | 1 | Send Retry Reply | 0 |
| Save Retry Request | main | 0 | Prepare Retry Dispatch | 0 |
| Prepare Retry Dispatch | main | 0 | Send Retry Reply | 0 |
| Send Retry Reply | main | 0 | Dispatch Accepted Retry | 0 |
| Dispatch Accepted Retry | main | 0 | Run Requested Video Worker | 0 |

## Code and configuration

- `Parse Retry Request`: [source](../../source/svc-retry-video/02-parse-retry-request.js)
- `Validate Video Retry`: [source](../../source/svc-retry-video/06-validate-video-retry.js)
- `Prepare Retry Dispatch`: [source](../../source/svc-retry-video/09-prepare-retry-dispatch.js)
- `Dispatch Accepted Retry`: [source](../../source/svc-retry-video/11-dispatch-accepted-retry.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
