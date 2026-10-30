# UFC | 3. Analyse Picker Video Transcripts

Turn captured transcripts into structured winner picks, props and fight reasoning while preserving event and fight identity.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/BvLnPFMwQ2vhPkgv) · [Sanitized snapshot](../../workflows/3-analyse-picker-video-transcripts.json)

## Identity and version

- Workflow ID: `BvLnPFMwQ2vhPkgv`
- Published: `True`
- Published version: `a7a7750c-433a-44f9-ae96-0739fb0bf34b`
- Draft version: `a7a7750c-433a-44f9-ae96-0739fb0bf34b`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 65
- Timezone: `inherits instance timezone; not present in MCP snapshot`

## How it works

1. Load the active event, ensure its card and spreadsheet, validate the sheet contract, synchronize bout IDs, detect official card changes and apply eligible changes before extraction.
2. Select captured videos for this event with no analysis, retryable FAILED/RETRY state, stale PROCESSING state, explicit targeted retry or CARD_CHANGED. Automatic analysis normally caps attempts at three; PROCESSING becomes stale after one hour.
3. Reassemble transcript parts in order, build official-card context and mark each selected video PROCESSING, incrementing the analysis attempt count.
4. Request strict JSON extraction through OpenRouter using openai/gpt-6-luna-pro with deepseek/deepseek-v4.1-flash-1017 fallback, maximum 20,000 output tokens and configured provider output-price ceiling 0.66 USD per million tokens.
5. Parse and validate extracted fighters, fight order, confidence, props and reasoning. When a non-bingo card of at least five bouts yields fewer than three winner picks and under 30% coverage, make one diversity retry with DeepSeek.
6. Build stable row identifiers and write Picks, Props, Fight Analysis and Extraction Log records; verify the configured completion signals before marking the video COMPLETED.
7. Record model, prompt version, token/cost information and validation outcomes; deliver the Telegram summary and finish the analysis run ledger.

## Important behavior and limits

Explicit manual targets can bypass the automatic attempt cap; completed videos are protected by the retry service. Verify All Writes checks picks, props and extraction_log signals; it is not a transaction or a complete read-back audit of every spreadsheet cell. Fight Analysis has its own upstream write path. Configured models and ceilings are snapshot settings, not a promise of current vendor pricing.

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
              2,
              3,
              4,
              5,
              6
            ],
            "triggerAtHour": 6,
            "triggerAtMinute": 30
          },
          {
            "field": "weeks",
            "triggerAtDay": [
              2,
              3,
              4,
              5,
              6,
              1
            ],
            "triggerAtHour": 18,
            "triggerAtMinute": 30
          },
          {
            "field": "weeks",
            "triggerAtDay": [
              0,
              3,
              4,
              5,
              6,
              2
            ],
            "triggerAtHour": 12,
            "triggerAtMinute": 30
          }
        ]
      }
    }
  },
  {
    "name": "When Executed by Another Workflow",
    "type": "n8n-nodes-base.executeWorkflowTrigger",
    "parameters": {
      "inputSource": "passthrough"
    }
  }
]
```

Passthrough triggers accept caller JSON rather than enforcing a declared field schema. Inspect the linked validation/normalization code and caller mappings for runtime requirements. An omitted schedule field uses its n8n node default; see [schedules](../schedules.md).

## Connections to other workflows

Called by: [UFC | svc.add_video](svc-add-video.md) via `Analyse Submitted Video`, [UFC | 5. Telegram Command Router](5-telegram-command-router.md) via `Run Analysis`

- `Check UFC Spreadsheet` → [UFC | svc.check_event_spreadsheet](svc-check-event-spreadsheet.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Ensure UFC Fight Card` → [UFC | svc.ensure_event_spreadsheet](svc-ensure-event-spreadsheet.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Sync Bout IDs` → [UFC | svc.sync_bout_ids](svc-sync-bout-ids.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Detect Card Changes` → [UFC | svc.detect_card_changes](svc-detect-card-changes.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.
- `Apply Card Changes` → [UFC | svc.apply_card_changes](svc-apply-card-changes.md); waitForSubWorkflow=`True`; node type `n8n-nodes-base.executeWorkflow`.

Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Get Active UFC Event | ufc_events | get |  |
| Get Captured Videos | ufc_videos | get |  |
| Mark Analysis Processing | ufc_videos | update | analysis_status, analysis_attempt_count, last_attempt_at, analysis_execution_id |
| Record Analysis Complete | ufc_videos | update | analysis_status, analysis_model, analysis_prompt_version, analysed_at, analysis_error |
| Get UFC Events For Matching | ufc_events | get |  |
| Record Analysis Start | ufc_pipeline_runs | upsert | run_key, workflow_id, workflow_name, event_key, state, summary, execution_url, started_at |
| Record Analysis Idle | ufc_pipeline_runs | upsert | run_key, workflow_id, workflow_name, event_key, state, summary, execution_url, finished_at |
| Record Analysis Result | ufc_pipeline_runs | upsert | run_key, workflow_id, workflow_name, event_key, state, summary, execution_url, finished_at |
| Record Analysis Card Pending | ufc_pipeline_runs | upsert | run_key, workflow_id, workflow_name, event_key, state, summary, execution_url, finished_at |

Terminal nodes in the saved graph: `Upsert Fight Analysis`, `Record Analysis Idle`, `Record Analysis Result`, `Record Analysis Card Pending`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | Schedule Trigger | scheduleTrigger |  |  |
| 2 | Get Active UFC Event | dataTable | get ufc_events | executeOnce=True |
| 3 | One Active Event Only | limit |  |  |
| 4 | Get Captured Videos | dataTable | get ufc_videos | alwaysOutputData=True |
| 5 | Keep Videos Needing Analysis | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/05-keep-videos-needing-analysis.js) |  |
| 6 | Read Transcript Rows | googleSheets | read Transcripts |  |
| 7 | Build Complete Transcripts | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/07-build-complete-transcripts.js) |  |
| 8 | Max Analysis Videos | limit |  |  |
| 9 | Match Videos to Transcripts | merge | combine |  |
| 10 | Attach Active Event | merge | combine |  |
| 11 | Loop Over Videos | splitInBatches |  |  |
| 12 | Mark Analysis Processing | dataTable | update ufc_videos |  |
| 13 | Read Fight Card | googleSheets | read Fight Card |  |
| 14 | Build Fight Card Context | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/14-build-fight-card-context.js) |  |
| 15 | Attach Fight Card | merge | combine |  |
| 16 | Build OpenRouter Request | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/16-build-openrouter-request.js) |  |
| 17 | Call OpenRouter Extraction | httpRequest | https://openrouter.ai/api/v1/chat/completions |  |
| 18 | Parse OpenRouter Extraction | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/18-parse-openrouter-extraction.js) |  |
| 19 | Validate and Sort Extraction | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/19-validate-and-sort-extraction.js) |  |
| 20 | Sticky Note | stickyNote |  |  |
| 21 | Prepare Extraction Rows | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/21-prepare-extraction-rows.js) |  |
| 22 | Prepare Pick Rows | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/22-prepare-pick-rows.js) |  |
| 23 | Upsert Picks | googleSheets | appendOrUpdate Picks |  |
| 24 | Prepare Prop Rows | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/24-prepare-prop-rows.js) |  |
| 25 | Upsert Props | googleSheets | appendOrUpdate Props |  |
| 26 | Prepare Extraction Log | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/26-prepare-extraction-log.js) |  |
| 27 | Upsert Extraction Log | googleSheets | appendOrUpdate Extraction Log |  |
| 28 | Pick Branch Complete | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/28-pick-branch-complete.js) |  |
| 29 | Prop Branch Complete | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/29-prop-branch-complete.js) |  |
| 30 | Log Branch Complete | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/30-log-branch-complete.js) |  |
| 31 | Verify All Writes | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/31-verify-all-writes.js) |  |
| 32 | Merge Picks and Props | merge |  |  |
| 33 | Wait For All Writes | merge |  |  |
| 34 | Record Analysis Complete | dataTable | update ufc_videos |  |
| 35 | Build Telegram Pick Summary | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/35-build-telegram-pick-summary.js) |  |
| 36 | Send a text message | telegram | Telegram sendMessage | onError=continueRegularOutput, retryOnFail=True, maxTries=2, waitBetweenTries=3000 |
| 37 | Skip Props | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/37-skip-props.js) |  |
| 38 | Prop Rows Exist? | if |  |  |
| 39 | Prop Rows Exist?1 | if |  |  |
| 40 | Skip Picks | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/40-skip-picks.js) |  |
| 41 | When Executed by Another Workflow | executeWorkflowTrigger |  |  |
| 42 | Assess Extraction Coverage | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/42-assess-extraction-coverage.js) |  |
| 43 | Retry Needed? | if |  |  |
| 44 | Build Retry OpenRouter Request | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/44-build-retry-openrouter-request.js) |  |
| 45 | Call Retry OpenRouter Extraction | httpRequest | https://openrouter.ai/api/v1/chat/completions |  |
| 46 | Parse Retry OpenRouter Extraction | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/46-parse-retry-openrouter-extraction.js) |  |
| 47 | Validate Retry Extraction | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/47-validate-retry-extraction.js) |  |
| 48 | Prepare Fight Analysis Rows | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/48-prepare-fight-analysis-rows.js) |  |
| 49 | Fight Analysis Rows Exist? | if |  |  |
| 50 | Upsert Fight Analysis | googleSheets | appendOrUpdate Fight Analysis |  |
| 51 | Check UFC Spreadsheet | executeWorkflow | GQs7zaGeF1vZBRaj |  |
| 52 | Get UFC Events For Matching | dataTable | get ufc_events |  |
| 53 | Record Analysis Start | dataTable | upsert ufc_pipeline_runs |  |
| 54 | Restore Analysis Event | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/54-restore-analysis-event.js) |  |
| 55 | Analysis Work Found? | if |  |  |
| 56 | Record Analysis Idle | dataTable | upsert ufc_pipeline_runs |  |
| 57 | Record Analysis Result | dataTable | upsert ufc_pipeline_runs |  |
| 58 | Ensure UFC Fight Card | executeWorkflow | LuALxCWYzByUY2Iq |  |
| 59 | Fight Card Ready? | if |  |  |
| 60 | Record Analysis Card Pending | dataTable | upsert ufc_pipeline_runs |  |
| 61 | Sync Bout IDs | executeWorkflow | ya1uS9XFsrlhq6e3 |  |
| 62 | Detect Card Changes | executeWorkflow | UDRrGRyeFPL9Lk3S | onError=continueErrorOutput |
| 63 | Continue Without Card Check | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/63-continue-without-card-check.js) |  |
| 64 | Apply Card Changes | executeWorkflow | jWFGMw2faC2zLseh | onError=continueErrorOutput |
| 65 | Continue Without Card Apply | code | [JavaScript](../../source/3-analyse-picker-video-transcripts/65-continue-without-card-apply.js) |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| Get Active UFC Event | main | 0 | One Active Event Only | 0 |
| Get Captured Videos | main | 0 | Keep Videos Needing Analysis | 0 |
| Read Transcript Rows | main | 0 | Build Complete Transcripts | 0 |
| Build Complete Transcripts | main | 0 | Match Videos to Transcripts | 1 |
| Loop Over Videos | main | 0 | Record Analysis Result | 0 |
| Loop Over Videos | main | 1 | Mark Analysis Processing | 0 |
| Attach Active Event | main | 0 | Attach Fight Card | 0 |
| Mark Analysis Processing | main | 0 | Build OpenRouter Request | 0 |
| Read Fight Card | main | 0 | Build Fight Card Context | 0 |
| Build Fight Card Context | main | 0 | Attach Fight Card | 1 |
| Attach Fight Card | main | 0 | Loop Over Videos | 0 |
| Build OpenRouter Request | main | 0 | Call OpenRouter Extraction | 0 |
| Call OpenRouter Extraction | main | 0 | Parse OpenRouter Extraction | 0 |
| Parse OpenRouter Extraction | main | 0 | Validate and Sort Extraction | 0 |
| Validate and Sort Extraction | main | 0 | Assess Extraction Coverage | 0 |
| Prepare Extraction Rows | main | 0 | Prepare Pick Rows | 0 |
| Prepare Extraction Rows | main | 0 | Prepare Prop Rows | 0 |
| Prepare Extraction Rows | main | 0 | Prepare Extraction Log | 0 |
| Prepare Extraction Rows | main | 0 | Prepare Fight Analysis Rows | 0 |
| Prepare Pick Rows | main | 0 | Prop Rows Exist?1 | 0 |
| Prepare Prop Rows | main | 0 | Prop Rows Exist? | 0 |
| Prepare Extraction Log | main | 0 | Upsert Extraction Log | 0 |
| Upsert Picks | main | 0 | Pick Branch Complete | 0 |
| Upsert Props | main | 0 | Prop Branch Complete | 0 |
| Upsert Extraction Log | main | 0 | Log Branch Complete | 0 |
| Pick Branch Complete | main | 0 | Merge Picks and Props | 0 |
| Prop Branch Complete | main | 0 | Merge Picks and Props | 1 |
| Log Branch Complete | main | 0 | Wait For All Writes | 1 |
| Merge Picks and Props | main | 0 | Wait For All Writes | 0 |
| Wait For All Writes | main | 0 | Verify All Writes | 0 |
| Record Analysis Complete | main | 0 | Build Telegram Pick Summary | 0 |
| Verify All Writes | main | 0 | Record Analysis Complete | 0 |
| Build Telegram Pick Summary | main | 0 | Send a text message | 0 |
| Send a text message | main | 0 | Loop Over Videos | 0 |
| Skip Props | main | 0 | Prop Branch Complete | 0 |
| Prop Rows Exist? | main | 0 | Upsert Props | 0 |
| Prop Rows Exist? | main | 1 | Skip Props | 0 |
| Prop Rows Exist?1 | main | 0 | Upsert Picks | 0 |
| Prop Rows Exist?1 | main | 1 | Skip Picks | 0 |
| Skip Picks | main | 0 | Pick Branch Complete | 0 |
| Assess Extraction Coverage | main | 0 | Retry Needed? | 0 |
| Retry Needed? | main | 0 | Build Retry OpenRouter Request | 0 |
| Retry Needed? | main | 1 | Prepare Extraction Rows | 0 |
| Build Retry OpenRouter Request | main | 0 | Call Retry OpenRouter Extraction | 0 |
| Call Retry OpenRouter Extraction | main | 0 | Parse Retry OpenRouter Extraction | 0 |
| Parse Retry OpenRouter Extraction | main | 0 | Validate Retry Extraction | 0 |
| Validate Retry Extraction | main | 0 | Prepare Extraction Rows | 0 |
| Prepare Fight Analysis Rows | main | 0 | Fight Analysis Rows Exist? | 0 |
| Fight Analysis Rows Exist? | main | 0 | Upsert Fight Analysis | 0 |
| Match Videos to Transcripts | main | 0 | Max Analysis Videos | 0 |
| Max Analysis Videos | main | 0 | Attach Active Event | 0 |
| Check UFC Spreadsheet | main | 0 | Get Captured Videos | 0 |
| Check UFC Spreadsheet | main | 0 | Read Transcript Rows | 0 |
| Check UFC Spreadsheet | main | 0 | Attach Active Event | 1 |
| Check UFC Spreadsheet | main | 0 | Read Fight Card | 0 |
| Schedule Trigger | main | 0 | Get UFC Events For Matching | 0 |
| When Executed by Another Workflow | main | 0 | Get UFC Events For Matching | 0 |
| Get UFC Events For Matching | main | 0 | Get Active UFC Event | 0 |
| One Active Event Only | main | 0 | Record Analysis Start | 0 |
| Record Analysis Start | main | 0 | Restore Analysis Event | 0 |
| Keep Videos Needing Analysis | main | 0 | Analysis Work Found? | 0 |
| Analysis Work Found? | main | 0 | Match Videos to Transcripts | 0 |
| Analysis Work Found? | main | 1 | Record Analysis Idle | 0 |
| Restore Analysis Event | main | 0 | Ensure UFC Fight Card | 0 |
| Ensure UFC Fight Card | main | 0 | Fight Card Ready? | 0 |
| Fight Card Ready? | main | 0 | Detect Card Changes | 0 |
| Fight Card Ready? | main | 1 | Record Analysis Card Pending | 0 |
| Sync Bout IDs | main | 0 | Check UFC Spreadsheet | 0 |
| Detect Card Changes | main | 0 | Apply Card Changes | 0 |
| Detect Card Changes | main | 1 | Continue Without Card Check | 0 |
| Continue Without Card Check | main | 0 | Sync Bout IDs | 0 |
| Apply Card Changes | main | 0 | Sync Bout IDs | 0 |
| Apply Card Changes | main | 1 | Continue Without Card Apply | 0 |
| Continue Without Card Apply | main | 0 | Sync Bout IDs | 0 |

## Code and configuration

- `Keep Videos Needing Analysis`: [source](../../source/3-analyse-picker-video-transcripts/05-keep-videos-needing-analysis.js)
- `Build Complete Transcripts`: [source](../../source/3-analyse-picker-video-transcripts/07-build-complete-transcripts.js)
- `Build Fight Card Context`: [source](../../source/3-analyse-picker-video-transcripts/14-build-fight-card-context.js)
- `Build OpenRouter Request`: [source](../../source/3-analyse-picker-video-transcripts/16-build-openrouter-request.js)
- `Parse OpenRouter Extraction`: [source](../../source/3-analyse-picker-video-transcripts/18-parse-openrouter-extraction.js)
- `Validate and Sort Extraction`: [source](../../source/3-analyse-picker-video-transcripts/19-validate-and-sort-extraction.js)
- `Prepare Extraction Rows`: [source](../../source/3-analyse-picker-video-transcripts/21-prepare-extraction-rows.js)
- `Prepare Pick Rows`: [source](../../source/3-analyse-picker-video-transcripts/22-prepare-pick-rows.js)
- `Prepare Prop Rows`: [source](../../source/3-analyse-picker-video-transcripts/24-prepare-prop-rows.js)
- `Prepare Extraction Log`: [source](../../source/3-analyse-picker-video-transcripts/26-prepare-extraction-log.js)
- `Pick Branch Complete`: [source](../../source/3-analyse-picker-video-transcripts/28-pick-branch-complete.js)
- `Prop Branch Complete`: [source](../../source/3-analyse-picker-video-transcripts/29-prop-branch-complete.js)
- `Log Branch Complete`: [source](../../source/3-analyse-picker-video-transcripts/30-log-branch-complete.js)
- `Verify All Writes`: [source](../../source/3-analyse-picker-video-transcripts/31-verify-all-writes.js)
- `Build Telegram Pick Summary`: [source](../../source/3-analyse-picker-video-transcripts/35-build-telegram-pick-summary.js)
- `Skip Props`: [source](../../source/3-analyse-picker-video-transcripts/37-skip-props.js)
- `Skip Picks`: [source](../../source/3-analyse-picker-video-transcripts/40-skip-picks.js)
- `Assess Extraction Coverage`: [source](../../source/3-analyse-picker-video-transcripts/42-assess-extraction-coverage.js)
- `Build Retry OpenRouter Request`: [source](../../source/3-analyse-picker-video-transcripts/44-build-retry-openrouter-request.js)
- `Parse Retry OpenRouter Extraction`: [source](../../source/3-analyse-picker-video-transcripts/46-parse-retry-openrouter-extraction.js)
- `Validate Retry Extraction`: [source](../../source/3-analyse-picker-video-transcripts/47-validate-retry-extraction.js)
- `Prepare Fight Analysis Rows`: [source](../../source/3-analyse-picker-video-transcripts/48-prepare-fight-analysis-rows.js)
- `Restore Analysis Event`: [source](../../source/3-analyse-picker-video-transcripts/54-restore-analysis-event.js)
- `Continue Without Card Check`: [source](../../source/3-analyse-picker-video-transcripts/63-continue-without-card-check.js)
- `Continue Without Card Apply`: [source](../../source/3-analyse-picker-video-transcripts/65-continue-without-card-apply.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
