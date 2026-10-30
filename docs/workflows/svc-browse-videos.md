# UFC | svc.browse_videos

Browse captured event videos and reopen saved analysis summaries in Telegram.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/IodUUBrjWAVd0cHi) · [Sanitized snapshot](../../workflows/svc-browse-videos.json)

## Identity and version

- Workflow ID: `IodUUBrjWAVd0cHi`
- Published: `True`
- Published version: `66e79413-f39f-43fe-8ef3-25351c6e3673`
- Draft version: `66e79413-f39f-43fe-8ef3-25351c6e3673`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 26
- Timezone: `Australia/Sydney`

## How it works

1. Normalize owner-only /videos [page] and /video VIDEO_ID [summaryPage] [listPage] requests.
2. Read active-event metadata and video rows, retain captured videos only and deduplicate video IDs.
3. List eight videos per page, with analysis status and navigation. A video detail verifies event scope and reads saved Picks and Props.
4. Build escaped, bounded HTML summary pages, preserve the return list page, and provide watch/spreadsheet links.
5. Flatten callback buttons and route to one of twelve native Telegram nodes with fixed keyboard row counts.

## Important behavior and limits

This service does not call capture or an LLM and does not charge analysis credits. A pending/failed analysis is shown explicitly. Fixed keyboard-size branches work around Telegram node validation constraints on dynamically sized keyboard arrays.

## Triggers and input contract

```json
[
  {
    "name": "When Called",
    "type": "n8n-nodes-base.executeWorkflowTrigger",
    "parameters": {
      "inputSource": "passthrough"
    }
  },
  {
    "name": "Test Manually",
    "type": "n8n-nodes-base.manualTrigger",
    "parameters": {}
  }
]
```

Passthrough triggers accept caller JSON rather than enforcing a declared field schema. Inspect the linked validation/normalization code and caller mappings for runtime requirements. An omitted schedule field uses its n8n node default; see [schedules](../schedules.md).

## Connections to other workflows

Called by: [UFC | 5. Telegram Command Router](5-telegram-command-router.md) via `Run Video Browser`


Configured error handler: `None`. See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read Active Event | ufc_events | get |  |
| Read Event Videos | ufc_videos | get |  |

Terminal nodes in the saved graph: `Send Video Browser`, `Send Video Browser 2`, `Send Video Browser 3`, `Send Video Browser 4`, `Send Video Browser 5`, `Send Video Browser 6`, `Send Video Browser 7`, `Send Video Browser 8`, `Send Video Browser 9`, `Send Video Browser 10`, `Send Video Browser 11`, `Send Video Browser 12`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Normalize Video Request | code | [JavaScript](../../source/svc-browse-videos/02-normalize-video-request.js) |  |
| 3 | Test Manually | manualTrigger |  |  |
| 4 | Manual Test Request | code | [JavaScript](../../source/svc-browse-videos/04-manual-test-request.js) |  |
| 5 | Read Active Event | dataTable | get ufc_events | alwaysOutputData=True, executeOnce=True |
| 6 | Read Event Videos | dataTable | get ufc_videos | alwaysOutputData=True, executeOnce=True |
| 7 | Choose Video View | code | [JavaScript](../../source/svc-browse-videos/07-choose-video-view.js) |  |
| 8 | Read Saved Summary? | if |  |  |
| 9 | Read Saved Picks | googleSheets | read Picks | onError=continueRegularOutput, alwaysOutputData=True, executeOnce=True |
| 10 | Video Browser Result | code | [JavaScript](../../source/svc-browse-videos/10-video-browser-result.js) |  |
| 11 | Read Saved Props | googleSheets | read Props | onError=continueRegularOutput, alwaysOutputData=True, executeOnce=True |
| 12 | Build Saved Summary | code | [JavaScript](../../source/svc-browse-videos/12-build-saved-summary.js) |  |
| 13 | Notify Owner? | if |  |  |
| 14 | Send Video Browser | telegram | Telegram sendMessage |  |
| 15 | Choose Keyboard Size | switch | rules |  |
| 16 | Send Video Browser 2 | telegram | Telegram sendMessage |  |
| 17 | Send Video Browser 3 | telegram | Telegram sendMessage |  |
| 18 | Send Video Browser 4 | telegram | Telegram sendMessage |  |
| 19 | Send Video Browser 5 | telegram | Telegram sendMessage |  |
| 20 | Send Video Browser 6 | telegram | Telegram sendMessage |  |
| 21 | Send Video Browser 7 | telegram | Telegram sendMessage |  |
| 22 | Send Video Browser 8 | telegram | Telegram sendMessage |  |
| 23 | Send Video Browser 9 | telegram | Telegram sendMessage |  |
| 24 | Send Video Browser 10 | telegram | Telegram sendMessage |  |
| 25 | Send Video Browser 11 | telegram | Telegram sendMessage |  |
| 26 | Send Video Browser 12 | telegram | Telegram sendMessage |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Normalize Video Request | 0 |
| Normalize Video Request | main | 0 | Read Active Event | 0 |
| Test Manually | main | 0 | Manual Test Request | 0 |
| Manual Test Request | main | 0 | Normalize Video Request | 0 |
| Read Active Event | main | 0 | Read Event Videos | 0 |
| Read Event Videos | main | 0 | Choose Video View | 0 |
| Choose Video View | main | 0 | Read Saved Summary? | 0 |
| Read Saved Summary? | main | 0 | Read Saved Picks | 0 |
| Read Saved Summary? | main | 1 | Video Browser Result | 0 |
| Read Saved Picks | main | 0 | Read Saved Props | 0 |
| Video Browser Result | main | 0 | Notify Owner? | 0 |
| Read Saved Props | main | 0 | Build Saved Summary | 0 |
| Build Saved Summary | main | 0 | Video Browser Result | 0 |
| Notify Owner? | main | 0 | Choose Keyboard Size | 0 |
| Choose Keyboard Size | main | 0 | Send Video Browser | 0 |
| Choose Keyboard Size | main | 1 | Send Video Browser 2 | 0 |
| Choose Keyboard Size | main | 2 | Send Video Browser 3 | 0 |
| Choose Keyboard Size | main | 3 | Send Video Browser 4 | 0 |
| Choose Keyboard Size | main | 4 | Send Video Browser 5 | 0 |
| Choose Keyboard Size | main | 5 | Send Video Browser 6 | 0 |
| Choose Keyboard Size | main | 6 | Send Video Browser 7 | 0 |
| Choose Keyboard Size | main | 7 | Send Video Browser 8 | 0 |
| Choose Keyboard Size | main | 8 | Send Video Browser 9 | 0 |
| Choose Keyboard Size | main | 9 | Send Video Browser 10 | 0 |
| Choose Keyboard Size | main | 10 | Send Video Browser 11 | 0 |
| Choose Keyboard Size | main | 11 | Send Video Browser 12 | 0 |

## Code and configuration

- `Normalize Video Request`: [source](../../source/svc-browse-videos/02-normalize-video-request.js)
- `Manual Test Request`: [source](../../source/svc-browse-videos/04-manual-test-request.js)
- `Choose Video View`: [source](../../source/svc-browse-videos/07-choose-video-view.js)
- `Video Browser Result`: [source](../../source/svc-browse-videos/10-video-browser-result.js)
- `Build Saved Summary`: [source](../../source/svc-browse-videos/12-build-saved-summary.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
