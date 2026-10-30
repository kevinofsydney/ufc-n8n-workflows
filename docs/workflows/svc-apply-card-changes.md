# UFC | svc.apply_card_changes

Apply eligible recorded Fight Card changes and queue affected videos for re-analysis.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/jWFGMw2faC2zLseh) · [Sanitized snapshot](../../workflows/svc-apply-card-changes.json)

## Identity and version

- Workflow ID: `jWFGMw2faC2zLseh`
- Published: `True`
- Published version: `2f4d44ab-58fa-4345-aec6-74f5a79883d9`
- Draft version: `2f4d44ab-58fa-4345-aec6-74f5a79883d9`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 26
- Timezone: `Australia/Sydney`

## How it works

1. Read pending card state, Fight Card, Picks, Props, Fight Analysis, event videos and transcripts.
2. Plan changes, preserving stable bout associations. Reorder existing references, void rows for removed/replaced bouts and identify videos needing a fresh extraction.
3. Apply only allowed changes. Require the configured removal confirmation and review gates; uncertain or excessive removals remain pending/NEEDS_REVIEW.
4. Write planned spreadsheet columns sequentially and read the affected tabs back to verify the result.
5. Record applied/partially applied state, flag relevant captured videos CARD_CHANGED, and send one change summary when configured.

## Important behavior and limits

This worker mutates sheet data. It does not itself run the analysis model; CARD_CHANGED videos are selected by the next analysis pass. Column writes are not atomic, so PARTLY_APPLIED and verification failures need inspection before retrying.

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

Called by: [UFC | 3. Analyse Picker Video Transcripts](3-analyse-picker-video-transcripts.md) via `Apply Card Changes`


Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read Fight Card State | ufc_fight_card_state | get |  |
| Read Event Videos | ufc_videos | get |  |
| Record Applied Card | ufc_fight_card_state | update | status, card_fingerprint, source_card_json, change_status, pending_change_json, pending_change_fingerprint, pending_seen_count, pending_first_seen_at, official_card_json, change_checked_at, checked_at |
| Mark Video For Reanalysis | ufc_videos | update | analysis_status, retry_stage, retry_requested_at, analysis_error |

Terminal nodes in the saved graph: `Explain Card Write Failure`, `Return Card Changes`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Read Fight Card State | dataTable | get ufc_fight_card_state | alwaysOutputData=True |
| 3 | Read Fight Card | googleSheets | read 'Fight Card'!A:I | executeOnce=True |
| 4 | Read Picks | googleSheets | read 'Picks'!A:ZZ | executeOnce=True |
| 5 | Read Props | googleSheets | read 'Props'!A:ZZ | executeOnce=True |
| 6 | Read Fight Analysis | googleSheets | read 'Fight Analysis'!A:ZZ | executeOnce=True |
| 7 | Read Event Videos | dataTable | get ufc_videos | alwaysOutputData=True, executeOnce=True |
| 8 | Read Transcripts | googleSheets | read 'Transcripts'!A:ZZ | executeOnce=True |
| 9 | Plan Card Changes | code | [JavaScript](../../source/svc-apply-card-changes/09-plan-card-changes.js) |  |
| 10 | Should Apply? | if |  |  |
| 11 | Split Card Writes | code | [JavaScript](../../source/svc-apply-card-changes/11-split-card-writes.js) |  |
| 12 | Each Card Write | splitInBatches |  |  |
| 13 | Write Card Column | googleSheets | update ={{ $json.range }} | onError=continueErrorOutput |
| 14 | Explain Card Write Failure | code | [JavaScript](../../source/svc-apply-card-changes/14-explain-card-write-failure.js) |  |
| 15 | Recheck Fight Card | googleSheets | read 'Fight Card'!A:I | executeOnce=True |
| 16 | Recheck Picks | googleSheets | read 'Picks'!A:ZZ | executeOnce=True |
| 17 | Recheck Props | googleSheets | read 'Props'!A:ZZ | executeOnce=True |
| 18 | Recheck Fight Analysis | googleSheets | read 'Fight Analysis'!A:ZZ | executeOnce=True |
| 19 | Verify Card Changes | code | [JavaScript](../../source/svc-apply-card-changes/19-verify-card-changes.js) |  |
| 20 | Record Applied Card | dataTable | update ufc_fight_card_state |  |
| 21 | Split Videos To Reanalyse | code | [JavaScript](../../source/svc-apply-card-changes/21-split-videos-to-reanalyse.js) |  |
| 22 | Any Videos? | if |  |  |
| 23 | Mark Video For Reanalysis | dataTable | update ufc_videos |  |
| 24 | Notify? | if |  | executeOnce=True |
| 25 | Send Card Change Summary | telegram | Telegram sendMessage | executeOnce=True |
| 26 | Return Card Changes | code | [JavaScript](../../source/svc-apply-card-changes/26-return-card-changes.js) | executeOnce=True |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Read Fight Card State | 0 |
| Read Fight Card State | main | 0 | Read Fight Card | 0 |
| Read Fight Card | main | 0 | Read Picks | 0 |
| Read Picks | main | 0 | Read Props | 0 |
| Read Props | main | 0 | Read Fight Analysis | 0 |
| Read Fight Analysis | main | 0 | Read Event Videos | 0 |
| Read Event Videos | main | 0 | Read Transcripts | 0 |
| Read Transcripts | main | 0 | Plan Card Changes | 0 |
| Plan Card Changes | main | 0 | Should Apply? | 0 |
| Split Card Writes | main | 0 | Each Card Write | 0 |
| Write Card Column | main | 0 | Each Card Write | 0 |
| Write Card Column | main | 1 | Explain Card Write Failure | 0 |
| Recheck Fight Card | main | 0 | Recheck Picks | 0 |
| Recheck Picks | main | 0 | Recheck Props | 0 |
| Recheck Props | main | 0 | Recheck Fight Analysis | 0 |
| Recheck Fight Analysis | main | 0 | Verify Card Changes | 0 |
| Verify Card Changes | main | 0 | Record Applied Card | 0 |
| Record Applied Card | main | 0 | Split Videos To Reanalyse | 0 |
| Split Videos To Reanalyse | main | 0 | Any Videos? | 0 |
| Mark Video For Reanalysis | main | 0 | Notify? | 0 |
| Send Card Change Summary | main | 0 | Return Card Changes | 0 |
| Should Apply? | main | 0 | Split Card Writes | 0 |
| Should Apply? | main | 1 | Notify? | 0 |
| Each Card Write | main | 0 | Recheck Fight Card | 0 |
| Each Card Write | main | 1 | Write Card Column | 0 |
| Any Videos? | main | 0 | Mark Video For Reanalysis | 0 |
| Any Videos? | main | 1 | Notify? | 0 |
| Notify? | main | 0 | Send Card Change Summary | 0 |
| Notify? | main | 1 | Return Card Changes | 0 |

## Code and configuration

- `Plan Card Changes`: [source](../../source/svc-apply-card-changes/09-plan-card-changes.js)
- `Split Card Writes`: [source](../../source/svc-apply-card-changes/11-split-card-writes.js)
- `Explain Card Write Failure`: [source](../../source/svc-apply-card-changes/14-explain-card-write-failure.js)
- `Verify Card Changes`: [source](../../source/svc-apply-card-changes/19-verify-card-changes.js)
- `Split Videos To Reanalyse`: [source](../../source/svc-apply-card-changes/21-split-videos-to-reanalyse.js)
- `Return Card Changes`: [source](../../source/svc-apply-card-changes/26-return-card-changes.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
