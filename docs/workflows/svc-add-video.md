# UFC | svc.add_video

Capture and analyse one owner-submitted public YouTube video from /addvideo.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/JcNXgWql9K4RrHm9) · [Sanitized snapshot](../../workflows/svc-add-video.json)

## Identity and version

- Workflow ID: `JcNXgWql9K4RrHm9`
- Published: `True`
- Published version: `bf121e7d-0638-4d68-80f7-371b1e0b573c`
- Draft version: `bf121e7d-0638-4d68-80f7-371b1e0b573c`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 24
- Timezone: `Australia/Sydney`

## How it works

1. Parse and canonicalize an allowed YouTube URL; reject malformed/ambiguous URLs and non-owner input.
2. Read public oEmbed metadata, the event catalogue and any saved video with the same ID.
3. Require one future active event with a spreadsheet and a title identifying that event. Reject duplicates and videos assigned elsewhere; manual test defaults to dry_run.
4. Reserve a video row, then conditionally claim an empty status as MANUAL_CAPTURE_REQUESTED. Only a successful claim dispatches capture.
5. Run targeted capture and wait, reread the row, then run targeted analysis only if capture succeeded and analysis is unfinished.
6. Reread the final record and send a success/failure/duplicate reply with useful navigation.

## Important behavior and limits

This route still uses oEmbed for submitted-video metadata; the YouTube Data API migration concerns channel discovery. The conditional claim reduces duplicate dispatch but is not a universal lock across every scheduled worker.

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

Called by: [UFC | 5. Telegram Command Router](5-telegram-command-router.md) via `Run Add Video`

- `Capture Submitted Video` → [UFC | 2. Extract Picker Video Transcripts](2-extract-picker-video-transcripts.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Analyse Submitted Video` → [UFC | 3. Analyse Picker Video Transcripts](3-analyse-picker-video-transcripts.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.

Configured error handler: `None`. See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read UFC Events | ufc_events | get |  |
| Read Existing Video | ufc_videos | get |  |
| Reserve Video | ufc_videos | upsert | video_id, channel_name, video_title, event_key, analysis_profile, event_match_status, event_match_reason, matched_event_key, event_match_version |
| Read Capture Result | ufc_videos | get |  |
| Read Analysis Result | ufc_videos | get |  |
| Claim Submitted Video | ufc_videos | update | status, retry_requested_at, retry_stage |

Terminal nodes in the saved graph: `Send Add Video Reply`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Parse Add Video | code | [JavaScript](../../source/svc-add-video/02-parse-add-video.js) |  |
| 3 | Test Manually | manualTrigger |  |  |
| 4 | Manual Test Request | code | [JavaScript](../../source/svc-add-video/04-manual-test-request.js) |  |
| 5 | Valid YouTube URL? | if |  |  |
| 6 | Read UFC Events | dataTable | get ufc_events | alwaysOutputData=True, executeOnce=True |
| 7 | Add Video Result | code | [JavaScript](../../source/svc-add-video/07-add-video-result.js) |  |
| 8 | Read Existing Video | dataTable | get ufc_videos | alwaysOutputData=True, executeOnce=True |
| 9 | Read YouTube Metadata | httpRequest | https://www.youtube.com/oembed | onError=continueRegularOutput |
| 10 | Validate Add Video | code | [JavaScript](../../source/svc-add-video/10-validate-add-video.js) |  |
| 11 | Add This Video? | if |  |  |
| 12 | Reserve Video | dataTable | upsert ufc_videos |  |
| 13 | Prepare Single Capture | code | [JavaScript](../../source/svc-add-video/13-prepare-single-capture.js) |  |
| 14 | Capture Submitted Video | executeWorkflow | y20ZZYzBVS6y8kC0 | onError=continueRegularOutput, alwaysOutputData=True |
| 15 | Read Capture Result | dataTable | get ufc_videos | alwaysOutputData=True, executeOnce=True |
| 16 | Prepare Single Analysis | code | [JavaScript](../../source/svc-add-video/16-prepare-single-analysis.js) |  |
| 17 | Transcript Ready? | if |  |  |
| 18 | Analyse Submitted Video | executeWorkflow | BvLnPFMwQ2vhPkgv | onError=continueRegularOutput, alwaysOutputData=True |
| 19 | Read Analysis Result | dataTable | get ufc_videos | alwaysOutputData=True, executeOnce=True |
| 20 | Build Final Reply | code | [JavaScript](../../source/svc-add-video/20-build-final-reply.js) |  |
| 21 | Notify Owner? | if |  |  |
| 22 | Send Add Video Reply | telegram | Telegram sendMessage | onError=continueRegularOutput |
| 23 | Claim Submitted Video | dataTable | update ufc_videos | alwaysOutputData=True |
| 24 | Capture Claim Acquired? | if |  |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Parse Add Video | 0 |
| Parse Add Video | main | 0 | Valid YouTube URL? | 0 |
| Manual Test Request | main | 0 | Parse Add Video | 0 |
| Valid YouTube URL? | main | 0 | Read UFC Events | 0 |
| Valid YouTube URL? | main | 1 | Add Video Result | 0 |
| Read UFC Events | main | 0 | Read Existing Video | 0 |
| Add Video Result | main | 0 | Notify Owner? | 0 |
| Read Existing Video | main | 0 | Read YouTube Metadata | 0 |
| Read YouTube Metadata | main | 0 | Validate Add Video | 0 |
| Validate Add Video | main | 0 | Add This Video? | 0 |
| Add This Video? | main | 0 | Reserve Video | 0 |
| Add This Video? | main | 1 | Add Video Result | 0 |
| Capture Submitted Video | main | 0 | Read Capture Result | 0 |
| Read Capture Result | main | 0 | Prepare Single Analysis | 0 |
| Prepare Single Analysis | main | 0 | Transcript Ready? | 0 |
| Transcript Ready? | main | 0 | Analyse Submitted Video | 0 |
| Transcript Ready? | main | 1 | Add Video Result | 0 |
| Analyse Submitted Video | main | 0 | Read Analysis Result | 0 |
| Read Analysis Result | main | 0 | Build Final Reply | 0 |
| Build Final Reply | main | 0 | Add Video Result | 0 |
| Notify Owner? | main | 0 | Send Add Video Reply | 0 |
| Reserve Video | main | 0 | Claim Submitted Video | 0 |
| Claim Submitted Video | main | 0 | Prepare Single Capture | 0 |
| Prepare Single Capture | main | 0 | Capture Claim Acquired? | 0 |
| Capture Claim Acquired? | main | 0 | Capture Submitted Video | 0 |
| Capture Claim Acquired? | main | 1 | Add Video Result | 0 |
| Test Manually | main | 0 | Manual Test Request | 0 |

## Code and configuration

- `Parse Add Video`: [source](../../source/svc-add-video/02-parse-add-video.js)
- `Manual Test Request`: [source](../../source/svc-add-video/04-manual-test-request.js)
- `Add Video Result`: [source](../../source/svc-add-video/07-add-video-result.js)
- `Validate Add Video`: [source](../../source/svc-add-video/10-validate-add-video.js)
- `Prepare Single Capture`: [source](../../source/svc-add-video/13-prepare-single-capture.js)
- `Prepare Single Analysis`: [source](../../source/svc-add-video/16-prepare-single-analysis.js)
- `Build Final Reply`: [source](../../source/svc-add-video/20-build-final-reply.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
