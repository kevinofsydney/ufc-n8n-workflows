# UFC | 2. Extract Picker Video Transcripts

Discover eligible prediction videos for the active event and save English transcript chunks to its spreadsheet.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/y20ZZYzBVS6y8kC0) · [Sanitized snapshot](../../workflows/2-extract-picker-video-transcripts.json)

## Identity and version

- Workflow ID: `y20ZZYzBVS6y8kC0`
- Published: `True`
- Published version: `50f5245f-619e-4c4a-ab25-b952c48ca0f7`
- Draft version: `50f5245f-619e-4c4a-ab25-b952c48ca0f7`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 57
- Timezone: `inherits instance timezone; not present in MCP snapshot`

## How it works

1. Load all known events and the active event, ensure its spreadsheet, and write a running pipeline ledger entry.
2. Ordinary scans resolve all 13 channel uploads playlists with channels.list and fetch playlistItems.list pages. Each page holds 50 videos; stop on no nextPageToken or an entirely older-than-six-days page, with ten pages maximum per channel.
3. Normalize video IDs, owners and original publication dates. Keep recent UFC prediction/pick/breakdown titles; reject excluded formats and ambiguous or other-event titles.
4. Skip previously recorded videos; permit RETRY_LATER below three attempts after a five-hour gap. Process at most ten selected videos per run, with new videos ahead of retries.
5. Before Supadata, batch video IDs into videos.list requests of at most 50. Require duration over 181 seconds (three minutes plus one second API rounding tolerance), and reject explicit Shorts paths/title markers. Missing or invalid metadata blocks processing. This shared gate also protects targeted capture retries. Report excluded short clips in capture summaries.
6. Fetch English native captions with Supadata. Validate language and content, split at 49,000 characters and upsert transcript chunks by record_id.
7. Record CAPTURED_AUTO and transcript_appended on success; otherwise record RETRY_LATER or NO_ENGLISH_TRANSCRIPT and attempt/error metadata.
8. Send one completion summary and finish the run ledger. Empty scans report nothing new; API failures explicitly report an incomplete scan.
9. A targeted manual_retry request bypasses discovery and processes only the validated target_video_row.

## Important behavior and limits

Capture does not automatically invoke analysis. Scheduled analysis, /analyse or add_video handles that next step. YouTube Data API discovers metadata; Supadata still extracts captions. A completed n8n execution can contain channel errors, so inspect the run state and Telegram summary.

## Triggers and input contract

```json
[
  {
    "name": "Schedule Trigger",
    "type": "n8n-nodes-base.scheduleTrigger",
    "parameters": {
      "rule": {
        "interval": [
          {
            "field": "weeks",
            "triggerAtDay": [
              1,
              2,
              3,
              4,
              5,
              6
            ],
            "triggerAtHour": 18
          },
          {
            "field": "weeks",
            "triggerAtDay": [
              1,
              2,
              3,
              4,
              5,
              6
            ],
            "triggerAtHour": 6
          }
        ]
      }
    }
  },
  {
    "name": "Run On Demand",
    "type": "n8n-nodes-base.executeWorkflowTrigger",
    "parameters": {
      "inputSource": "passthrough"
    }
  }
]
```

Passthrough triggers accept caller JSON rather than enforcing a declared field schema. Inspect the linked validation/normalization code and caller mappings for runtime requirements. An omitted schedule field uses its n8n node default; see [schedules](../schedules.md).

## Connections to other workflows

Called by: [UFC | svc.add_video](svc-add-video.md) via `Capture Submitted Video`, [UFC | 5. Telegram Command Router](5-telegram-command-router.md) via `Run Capture`

- `Ensure UFC Event Spreadsheet` → [UFC | svc.ensure_event_spreadsheet](svc-ensure-event-spreadsheet.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.

Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Record Captured Video | ufc_videos | upsert | transcript_appended, video_id, channel_name, video_title, published_at, event_key, status, attempt_count, last_attempt_at, last_http_status, last_error, transcript_parts, completed_at, analysis_profile, event_match_status, event_match_reason, matched_event_key, event_match_version |
| Get Active UFC Event | ufc_events | get |  |
| Get Recorded Videos | ufc_videos | get |  |
| Record Retry Status | ufc_videos | upsert | video_id, channel_name, video_title, published_at, event_key, status, attempt_count, last_attempt_at, last_http_status, last_error, transcript_appended, transcript_parts, analysis_profile, event_match_status, event_match_reason, matched_event_key, event_match_version |
| Get UFC Events For Matching | ufc_events | get |  |
| Record Capture Start | ufc_pipeline_runs | upsert | run_key, workflow_id, workflow_name, event_key, state, summary, execution_url, started_at |
| Record Capture Idle | ufc_pipeline_runs | upsert | run_key, workflow_id, workflow_name, event_key, state, summary, execution_url, finished_at |
| Record Capture Result | ufc_pipeline_runs | upsert | run_key, workflow_id, workflow_name, event_key, state, summary, execution_url, finished_at |

Terminal nodes in the saved graph: `Send Telegram Summary`, `Record Capture Result`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | Schedule Trigger | scheduleTrigger |  |  |
| 2 | Get transcript | supadata | getTranscript | onError=continueRegularOutput |
| 3 | Merge All Channel Feeds | merge |  |  |
| 4 | Normalise and Filter Videos | code | [JavaScript](../../source/2-extract-picker-video-transcripts/04-normalise-and-filter-videos.js) |  |
| 5 | Transcript Received? | if |  |  |
| 6 | Append Transcript to Google Sheet | googleSheets | appendOrUpdate Transcripts |  |
| 7 | Record Captured Video | dataTable | upsert ufc_videos |  |
| 8 | Combine Video and Transcript | merge | combine |  |
| 9 | One Tracking Update Per Video | removeDuplicates |  |  |
| 10 | Prepare Transcript Chunks | code | [JavaScript](../../source/2-extract-picker-video-transcripts/10-prepare-transcript-chunks.js) |  |
| 11 | Max Video Limit (10) | limit |  |  |
| 12 | Get Active UFC Event | dataTable | get ufc_events | executeOnce=True |
| 13 | One Active Event Only | limit |  |  |
| 14 | Attach Active Event | merge | combine |  |
| 15 | Sticky Note | stickyNote |  |  |
| 16 | Event Ready | set |  |  |
| 17 | Send Telegram Summary | telegram | Telegram sendMessage |  |
| 18 | Build Telegram Summary | code | [JavaScript](../../source/2-extract-picker-video-transcripts/18-build-telegram-summary.js) |  |
| 19 | Prepare Captured Result | set |  |  |
| 20 | Run On Demand | executeWorkflowTrigger |  |  |
| 21 | Merge All Channel Feeds1 | merge | append |  |
| 22 | Merge All Channel Feeds2 | merge |  |  |
| 23 | Validate Transcript Language | code | [JavaScript](../../source/2-extract-picker-video-transcripts/23-validate-transcript-language.js) |  |
| 24 | Get Recorded Videos | dataTable | get ufc_videos | alwaysOutputData=True, executeOnce=True |
| 25 | Select Videos To Process | code | [JavaScript](../../source/2-extract-picker-video-transcripts/25-select-videos-to-process.js) |  |
| 26 | Prepare Retry Record | set |  |  |
| 27 | Record Retry Status | dataTable | upsert ufc_videos |  |
| 28 | Prepare Retry Result | set |  |  |
| 29 | Merge Run Results | merge |  |  |
| 30 | Ensure UFC Event Spreadsheet | executeWorkflow | LuALxCWYzByUY2Iq |  |
| 31 | Get UFC Events For Matching | dataTable | get ufc_events |  |
| 32 | Record Capture Start | dataTable | upsert ufc_pipeline_runs |  |
| 33 | Resolve Capture Request | code | [JavaScript](../../source/2-extract-picker-video-transcripts/33-resolve-capture-request.js) |  |
| 34 | Capture One Video? | if |  |  |
| 35 | Prepare Requested Capture | code | [JavaScript](../../source/2-extract-picker-video-transcripts/35-prepare-requested-capture.js) |  |
| 36 | Capture Work Found? | if |  |  |
| 37 | Record Capture Idle | dataTable | upsert ufc_pipeline_runs |  |
| 38 | Record Capture Result | dataTable | upsert ufc_pipeline_runs |  |
| 39 | Build Capture Idle Summary | code | [JavaScript](../../source/2-extract-picker-video-transcripts/39-build-capture-idle-summary.js) |  |
| 40 | Get YouTube Upload Playlists | httpRequest | https://www.googleapis.com/youtube/v3/channels | onError=continueRegularOutput, retryOnFail=True, maxTries=3, waitBetweenTries=2000, alwaysOutputData=True |
| 41 | YouTube — UFC Predictions Tracker | httpRequest | https://www.googleapis.com/youtube/v3/playlistItems | onError=continueRegularOutput, retryOnFail=True, maxTries=3, waitBetweenTries=2000, alwaysOutputData=True |
| 42 | YouTube — The MMA Guru | httpRequest | https://www.googleapis.com/youtube/v3/playlistItems | onError=continueRegularOutput, retryOnFail=True, maxTries=3, waitBetweenTries=2000, alwaysOutputData=True |
| 43 | YouTube — Lucrative James | httpRequest | https://www.googleapis.com/youtube/v3/playlistItems | onError=continueRegularOutput, retryOnFail=True, maxTries=3, waitBetweenTries=2000, alwaysOutputData=True |
| 44 | YouTube — MMA Lock of the Night | httpRequest | https://www.googleapis.com/youtube/v3/playlistItems | onError=continueRegularOutput, retryOnFail=True, maxTries=3, waitBetweenTries=2000, alwaysOutputData=True |
| 45 | YouTube — Kunath MMA | httpRequest | https://www.googleapis.com/youtube/v3/playlistItems | onError=continueRegularOutput, retryOnFail=True, maxTries=3, waitBetweenTries=2000, alwaysOutputData=True |
| 46 | YouTube — TonyHasDiedMMA | httpRequest | https://www.googleapis.com/youtube/v3/playlistItems | onError=continueRegularOutput, retryOnFail=True, maxTries=3, waitBetweenTries=2000, alwaysOutputData=True |
| 47 | YouTube — MMA Husky Hustler | httpRequest | https://www.googleapis.com/youtube/v3/playlistItems | onError=continueRegularOutput, retryOnFail=True, maxTries=3, waitBetweenTries=2000, alwaysOutputData=True |
| 48 | YouTube — Walk the Line MMA | httpRequest | https://www.googleapis.com/youtube/v3/playlistItems | onError=continueRegularOutput, retryOnFail=True, maxTries=3, waitBetweenTries=2000, alwaysOutputData=True |
| 49 | YouTube — Artem MMA | httpRequest | https://www.googleapis.com/youtube/v3/playlistItems | onError=continueRegularOutput, retryOnFail=True, maxTries=3, waitBetweenTries=2000, alwaysOutputData=True |
| 50 | YouTube — BedtimeMMA | httpRequest | https://www.googleapis.com/youtube/v3/playlistItems | onError=continueRegularOutput, retryOnFail=True, maxTries=3, waitBetweenTries=2000, alwaysOutputData=True |
| 51 | YouTube — BetSam | httpRequest | https://www.googleapis.com/youtube/v3/playlistItems | onError=continueRegularOutput, retryOnFail=True, maxTries=3, waitBetweenTries=2000, alwaysOutputData=True |
| 52 | YouTube — JakeGerberMMA | httpRequest | https://www.googleapis.com/youtube/v3/playlistItems | onError=continueRegularOutput, retryOnFail=True, maxTries=3, waitBetweenTries=2000, alwaysOutputData=True |
| 53 | YouTube — Funky Bunch MMA | httpRequest | https://www.googleapis.com/youtube/v3/playlistItems | onError=continueRegularOutput, retryOnFail=True, maxTries=3, waitBetweenTries=2000, alwaysOutputData=True |
| 54 | Prepare Video Duration Batches | code | [JavaScript](../../source/2-extract-picker-video-transcripts/54-prepare-video-duration-batches.js) |  |
| 55 | Read Video Durations | httpRequest | https://www.googleapis.com/youtube/v3/videos | retryOnFail=True, maxTries=3, waitBetweenTries=2000 |
| 56 | Exclude Shorts | code | [JavaScript](../../source/2-extract-picker-video-transcripts/56-exclude-shorts.js) |  |
| 57 | Long Videos Remain? | if |  |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| Merge All Channel Feeds | main | 0 | Merge All Channel Feeds2 | 0 |
| Normalise and Filter Videos | main | 0 | Attach Active Event | 1 |
| Get transcript | main | 0 | Combine Video and Transcript | 1 |
| Transcript Received? | main | 0 | Prepare Transcript Chunks | 0 |
| Transcript Received? | main | 1 | Prepare Retry Record | 0 |
| Append Transcript to Google Sheet | main | 0 | One Tracking Update Per Video | 0 |
| Combine Video and Transcript | main | 0 | Validate Transcript Language | 0 |
| One Tracking Update Per Video | main | 0 | Record Captured Video | 0 |
| Prepare Transcript Chunks | main | 0 | Append Transcript to Google Sheet | 0 |
| Max Video Limit (10) | main | 0 | Combine Video and Transcript | 0 |
| Max Video Limit (10) | main | 0 | Get transcript | 0 |
| Get Active UFC Event | main | 0 | One Active Event Only | 0 |
| Record Captured Video | main | 0 | Prepare Captured Result | 0 |
| Build Telegram Summary | main | 0 | Send Telegram Summary | 0 |
| Build Telegram Summary | main | 0 | Record Capture Result | 0 |
| Merge All Channel Feeds1 | main | 0 | Merge All Channel Feeds2 | 1 |
| Merge All Channel Feeds2 | main | 0 | Normalise and Filter Videos | 0 |
| Validate Transcript Language | main | 0 | Transcript Received? | 0 |
| Attach Active Event | main | 0 | Get Recorded Videos | 0 |
| Get Recorded Videos | main | 0 | Select Videos To Process | 0 |
| Prepare Retry Record | main | 0 | Record Retry Status | 0 |
| Record Retry Status | main | 0 | Prepare Retry Result | 0 |
| Prepare Captured Result | main | 0 | Merge Run Results | 0 |
| Prepare Retry Result | main | 0 | Merge Run Results | 1 |
| Merge Run Results | main | 0 | Build Telegram Summary | 0 |
| One Active Event Only | main | 0 | Ensure UFC Event Spreadsheet | 0 |
| Ensure UFC Event Spreadsheet | main | 0 | Event Ready | 0 |
| Schedule Trigger | main | 0 | Get UFC Events For Matching | 0 |
| Run On Demand | main | 0 | Get UFC Events For Matching | 0 |
| Get UFC Events For Matching | main | 0 | Get Active UFC Event | 0 |
| Event Ready | main | 0 | Record Capture Start | 0 |
| Record Capture Start | main | 0 | Resolve Capture Request | 0 |
| Resolve Capture Request | main | 0 | Capture One Video? | 0 |
| Capture One Video? | main | 0 | Prepare Requested Capture | 0 |
| Capture One Video? | main | 1 | Attach Active Event | 0 |
| Capture One Video? | main | 1 | Get YouTube Upload Playlists | 0 |
| Select Videos To Process | main | 0 | Capture Work Found? | 0 |
| Capture Work Found? | main | 0 | Prepare Video Duration Batches | 0 |
| Capture Work Found? | main | 1 | Record Capture Idle | 0 |
| Record Capture Idle | main | 0 | Build Capture Idle Summary | 0 |
| Build Capture Idle Summary | main | 0 | Send Telegram Summary | 0 |
| Get YouTube Upload Playlists | main | 0 | YouTube — UFC Predictions Tracker | 0 |
| Get YouTube Upload Playlists | main | 0 | YouTube — The MMA Guru | 0 |
| Get YouTube Upload Playlists | main | 0 | YouTube — Lucrative James | 0 |
| Get YouTube Upload Playlists | main | 0 | YouTube — MMA Lock of the Night | 0 |
| Get YouTube Upload Playlists | main | 0 | YouTube — Kunath MMA | 0 |
| Get YouTube Upload Playlists | main | 0 | YouTube — TonyHasDiedMMA | 0 |
| Get YouTube Upload Playlists | main | 0 | YouTube — MMA Husky Hustler | 0 |
| Get YouTube Upload Playlists | main | 0 | YouTube — Walk the Line MMA | 0 |
| Get YouTube Upload Playlists | main | 0 | YouTube — Artem MMA | 0 |
| Get YouTube Upload Playlists | main | 0 | YouTube — BedtimeMMA | 0 |
| Get YouTube Upload Playlists | main | 0 | YouTube — BetSam | 0 |
| Get YouTube Upload Playlists | main | 0 | YouTube — JakeGerberMMA | 0 |
| Get YouTube Upload Playlists | main | 0 | YouTube — Funky Bunch MMA | 0 |
| YouTube — UFC Predictions Tracker | main | 0 | Merge All Channel Feeds | 0 |
| YouTube — The MMA Guru | main | 0 | Merge All Channel Feeds | 1 |
| YouTube — Lucrative James | main | 0 | Merge All Channel Feeds | 2 |
| YouTube — MMA Lock of the Night | main | 0 | Merge All Channel Feeds | 3 |
| YouTube — Kunath MMA | main | 0 | Merge All Channel Feeds | 4 |
| YouTube — TonyHasDiedMMA | main | 0 | Merge All Channel Feeds | 5 |
| YouTube — MMA Husky Hustler | main | 0 | Merge All Channel Feeds | 6 |
| YouTube — Walk the Line MMA | main | 0 | Merge All Channel Feeds | 7 |
| YouTube — Artem MMA | main | 0 | Merge All Channel Feeds | 8 |
| YouTube — BedtimeMMA | main | 0 | Merge All Channel Feeds | 9 |
| YouTube — BetSam | main | 0 | Merge All Channel Feeds1 | 0 |
| YouTube — JakeGerberMMA | main | 0 | Merge All Channel Feeds1 | 1 |
| YouTube — Funky Bunch MMA | main | 0 | Merge All Channel Feeds1 | 2 |
| Prepare Video Duration Batches | main | 0 | Read Video Durations | 0 |
| Read Video Durations | main | 0 | Exclude Shorts | 0 |
| Prepare Requested Capture | main | 0 | Prepare Video Duration Batches | 0 |
| Exclude Shorts | main | 0 | Long Videos Remain? | 0 |
| Long Videos Remain? | main | 0 | Max Video Limit (10) | 0 |
| Long Videos Remain? | main | 1 | Record Capture Idle | 0 |

## Code and configuration

- `Normalise and Filter Videos`: [source](../../source/2-extract-picker-video-transcripts/04-normalise-and-filter-videos.js)
- `Prepare Transcript Chunks`: [source](../../source/2-extract-picker-video-transcripts/10-prepare-transcript-chunks.js)
- `Build Telegram Summary`: [source](../../source/2-extract-picker-video-transcripts/18-build-telegram-summary.js)
- `Validate Transcript Language`: [source](../../source/2-extract-picker-video-transcripts/23-validate-transcript-language.js)
- `Select Videos To Process`: [source](../../source/2-extract-picker-video-transcripts/25-select-videos-to-process.js)
- `Resolve Capture Request`: [source](../../source/2-extract-picker-video-transcripts/33-resolve-capture-request.js)
- `Prepare Requested Capture`: [source](../../source/2-extract-picker-video-transcripts/35-prepare-requested-capture.js)
- `Build Capture Idle Summary`: [source](../../source/2-extract-picker-video-transcripts/39-build-capture-idle-summary.js)
- `Prepare Video Duration Batches`: [source](../../source/2-extract-picker-video-transcripts/54-prepare-video-duration-batches.js)
- `Exclude Shorts`: [source](../../source/2-extract-picker-video-transcripts/56-exclude-shorts.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
