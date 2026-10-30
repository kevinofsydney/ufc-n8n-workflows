# UFC | 5. Telegram Command Router

Provide the owner-only Telegram command and inline-button entry point for the system.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/MabSJBF0Vt6sMICp) · [Sanitized snapshot](../../workflows/5-telegram-command-router.json)

## Identity and version

- Workflow ID: `MabSJBF0Vt6sMICp`
- Published: `True`
- Published version: `3f56928f-f0c8-4816-84a2-17a3d85b6df6`
- Draft version: `3f56928f-f0c8-4816-84a2-17a3d85b6df6`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 29
- Timezone: `inherits instance timezone; not present in MCP snapshot`

## How it works

1. Accept message and callback_query updates restricted to the configured owner chat. Normalize commands, arguments and callback data and answer button presses.
2. Route consensus, status, capture, analyse, grade, leaderboard, credits, retry, fixed, issue, issues, addvideo, videos and video requests.
3. For capture, analysis and grading, acknowledge immediately and dispatch the worker without waiting. Other routes generally wait for their service.
4. Build /status from events, videos, card state and pipeline-run tables; use the fallback menu for unrecognized commands.

## Important behavior and limits

The initial Capture started acknowledgement confirms dispatch, not a successful capture. The worker's final summary and ledger state establish the outcome. Telegram trigger ownership must remain unique when cloning this workflow.

## Triggers and input contract

```json
[
  {
    "name": "Telegram Message",
    "type": "n8n-nodes-base.telegramTrigger",
    "parameters": {
      "updates": [
        "message",
        "callback_query"
      ],
      "additionalFields": {
        "chatIds": "0"
      }
    }
  }
]
```

Passthrough triggers accept caller JSON rather than enforcing a declared field schema. Inspect the linked validation/normalization code and caller mappings for runtime requirements. An omitted schedule field uses its n8n node default; see [schedules](../schedules.md).

## Connections to other workflows

Called by: No static caller in the exported workflows; entry may be scheduled, external, dynamic or error-driven.

- `Run Consensus` → [UFC | 6. UFC Consensus Picks (weighted)](6-ufc-consensus-picks-weighted.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Run Capture` → [UFC | 2. Extract Picker Video Transcripts](2-extract-picker-video-transcripts.md); waitForSubWorkflow=`False`; node type `n8n-nodes-base.executeWorkflow`.
- `Run Analysis` → [UFC | 3. Analyse Picker Video Transcripts](3-analyse-picker-video-transcripts.md); waitForSubWorkflow=`False`; node type `n8n-nodes-base.executeWorkflow`.
- `Run Grading` → [UFC | 7. Grade Picks](7-grade-picks.md); waitForSubWorkflow=`False`; node type `n8n-nodes-base.executeWorkflow`.
- `Run Leaderboard` → [UFC | 8. Picker Leaderboard](8-picker-leaderboard.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Run Credits` → [UFC | 9. OpenRouter Balance](9-openrouter-balance.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Run Video Retry` → [UFC | svc.retry_video](svc-retry-video.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Run Resolve Incident` → [UFC | svc.resolve_incident](svc-resolve-incident.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Run Record Issue` → [UFC | svc.record_issue](svc-record-issue.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Run List Issues` → [UFC | svc.list_issues](svc-list-issues.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Run Add Video` → [UFC | svc.add_video](svc-add-video.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Run Video Browser` → [UFC | svc.browse_videos](svc-browse-videos.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.

Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Get Active Event | ufc_events | get |  |
| Get Event Videos | ufc_videos | get |  |
| Get UFC Events For Matching | ufc_events | get |  |
| Get Recent UFC Runs | ufc_pipeline_runs | get |  |
| Get UFC Fight Card Status | ufc_fight_card_state | get |  |

Terminal nodes in the saved graph: `Run Consensus`, `Send Reply`, `Run Capture`, `Run Analysis`, `Acknowledge Grade`, `Run Grading`, `Run Leaderboard`, `Answer Button Press`, `Send Menu`, `Run Credits`, `Run Video Retry`, `Run Resolve Incident`, `Run Record Issue`, `Run List Issues`, `Run Add Video`, `Run Video Browser`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | Telegram Message | telegramTrigger |  |  |
| 2 | Parse Command | set | manual |  |
| 3 | Route Command | switch | rules |  |
| 4 | Run Consensus | executeWorkflow | VkgPostfkMxFPWj6 |  |
| 5 | Get Active Event | dataTable | get ufc_events | alwaysOutputData=True, executeOnce=True |
| 6 | Get Event Videos | dataTable | get ufc_videos | alwaysOutputData=True, executeOnce=True |
| 7 | Build Status Message | code | [JavaScript](../../source/5-telegram-command-router/07-build-status-message.js) |  |
| 8 | Send Reply | telegram | Telegram sendMessage |  |
| 9 | Acknowledge Capture | telegram | Telegram sendMessage |  |
| 10 | Run Capture | executeWorkflow | y20ZZYzBVS6y8kC0 |  |
| 11 | Acknowledge Analysis | telegram | Telegram sendMessage |  |
| 12 | Run Analysis | executeWorkflow | BvLnPFMwQ2vhPkgv |  |
| 13 | Acknowledge Grade | telegram | Telegram sendMessage |  |
| 14 | Run Grading | executeWorkflow | PulwhLsIZhfvCGxl |  |
| 15 | Run Leaderboard | executeWorkflow | YeYpgLGiYlzCTopn |  |
| 16 | Is Owner? | if |  |  |
| 17 | Has Button Press? | if |  |  |
| 18 | Answer Button Press | telegram | Telegram answerQuery |  |
| 19 | Send Menu | telegram | Telegram sendMessage |  |
| 20 | Run Credits | executeWorkflow | f2CKNtQUpZ5Rm80Z |  |
| 21 | Get UFC Events For Matching | dataTable | get ufc_events |  |
| 22 | Get Recent UFC Runs | dataTable | get ufc_pipeline_runs |  |
| 23 | Run Video Retry | executeWorkflow | G1EMMFVSzpGE4q3Q |  |
| 24 | Get UFC Fight Card Status | dataTable | get ufc_fight_card_state |  |
| 25 | Run Resolve Incident | executeWorkflow | XN5zvwsajUldmPgN |  |
| 26 | Run Record Issue | executeWorkflow | fZB3SuyzKNXurQyI |  |
| 27 | Run List Issues | executeWorkflow | SkWzi2pqLtbW4HNN |  |
| 28 | Run Add Video | executeWorkflow | JcNXgWql9K4RrHm9 |  |
| 29 | Run Video Browser | executeWorkflow | IodUUBrjWAVd0cHi |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| Telegram Message | main | 0 | Parse Command | 0 |
| Route Command | main | 0 | Run Consensus | 0 |
| Route Command | main | 1 | Get UFC Events For Matching | 0 |
| Route Command | main | 2 | Acknowledge Capture | 0 |
| Route Command | main | 3 | Acknowledge Analysis | 0 |
| Route Command | main | 4 | Acknowledge Grade | 0 |
| Route Command | main | 4 | Run Grading | 0 |
| Route Command | main | 5 | Run Leaderboard | 0 |
| Route Command | main | 6 | Run Credits | 0 |
| Route Command | main | 7 | Run Video Retry | 0 |
| Route Command | main | 8 | Run Resolve Incident | 0 |
| Route Command | main | 9 | Run Record Issue | 0 |
| Route Command | main | 10 | Run List Issues | 0 |
| Route Command | main | 11 | Run Add Video | 0 |
| Route Command | main | 12 | Run Video Browser | 0 |
| Route Command | main | 13 | Run Video Browser | 0 |
| Route Command | main | 14 | Send Menu | 0 |
| Get Active Event | main | 0 | Get Event Videos | 0 |
| Build Status Message | main | 0 | Send Reply | 0 |
| Acknowledge Capture | main | 0 | Run Capture | 0 |
| Acknowledge Analysis | main | 0 | Run Analysis | 0 |
| Parse Command | main | 0 | Is Owner? | 0 |
| Is Owner? | main | 0 | Route Command | 0 |
| Is Owner? | main | 0 | Has Button Press? | 0 |
| Has Button Press? | main | 0 | Answer Button Press | 0 |
| Get UFC Events For Matching | main | 0 | Get Active Event | 0 |
| Get Event Videos | main | 0 | Get Recent UFC Runs | 0 |
| Get Recent UFC Runs | main | 0 | Get UFC Fight Card Status | 0 |
| Get UFC Fight Card Status | main | 0 | Build Status Message | 0 |

## Code and configuration

- `Build Status Message`: [source](../../source/5-telegram-command-router/07-build-status-message.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
