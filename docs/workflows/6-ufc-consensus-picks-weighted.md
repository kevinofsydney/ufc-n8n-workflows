# UFC | 6. UFC Consensus Picks (weighted)

Aggregate saved official picks into a weighted consensus and optionally explain each bout.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/VkgPostfkMxFPWj6) · [Sanitized snapshot](../../workflows/6-ufc-consensus-picks-weighted.json)

## Identity and version

- Workflow ID: `VkgPostfkMxFPWj6`
- Published: `True`
- Published version: `898de882-a8ab-44a7-b2cc-494b84dfb1ee`
- Draft version: `898de882-a8ab-44a7-b2cc-494b84dfb1ee`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 16
- Timezone: `Australia/Melbourne`

## How it works

1. Read the active event's Picks, Props and Fight Analysis plus historical pick grades and consensus cache.
2. Exclude VOID rows and select each channel's latest official pick per fight. Compute a confidence-led vote weight: confidence_score/5 multiplied by a shrunk historical-record factor capped to 0.85–1.15.
3. Use 100 prior picks at the global graded baseline to shrink records, with a slope of two. Plain mode assigns each pick weight one.
4. Group votes by fight, report weighted support, counts, confidence and method votes. Reuse cached explanations when the input hash matches; otherwise ask openai/gpt-6-luna and cache parsed explanations.
5. Respond to /consensus; scheduled digests only proceed when the active event is 1–30 hours away.

## Important behavior and limits

Weighted vote share is support from the tracked channels, not a calibrated chance of winning. Latest extraction wins per channel and fight. The scheduled daily check can return no items outside its event window.

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
    "name": "Daily Digest Check",
    "type": "n8n-nodes-base.scheduleTrigger",
    "parameters": {
      "rule": {
        "interval": [
          {
            "field": "days",
            "daysInterval": 1,
            "triggerAtHour": 18,
            "triggerAtMinute": 0
          }
        ]
      }
    }
  }
]
```

Passthrough triggers accept caller JSON rather than enforcing a declared field schema. Inspect the linked validation/normalization code and caller mappings for runtime requirements. An omitted schedule field uses its n8n node default; see [schedules](../schedules.md).

## Connections to other workflows

Called by: [UFC | 5. Telegram Command Router](5-telegram-command-router.md) via `Run Consensus`


Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Get Active Event | ufc_events | get |  |
| Get Pick Grades | ufc_pick_grades | get |  |
| Get Consensus Cache | ufc_consensus_cache | get |  |
| Save Explanations | ufc_consensus_cache | upsert | event_key, input_hash, explanations_json, model, cost_usd, created_at |

Terminal nodes in the saved graph: `Send Consensus`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Get Active Event | dataTable | get ufc_events | executeOnce=True |
| 3 | Daily Digest Check | scheduleTrigger |  |  |
| 4 | Read Picks | googleSheets | read Picks | alwaysOutputData=True, executeOnce=True |
| 5 | Read Props | googleSheets | read Props | alwaysOutputData=True, executeOnce=True |
| 6 | Read Fight Analysis | googleSheets | read Fight Analysis | alwaysOutputData=True, executeOnce=True |
| 7 | Get Pick Grades | dataTable | get ufc_pick_grades | alwaysOutputData=True, executeOnce=True |
| 8 | Get Consensus Cache | dataTable | get ufc_consensus_cache | alwaysOutputData=True, executeOnce=True |
| 9 | Build Weighted Consensus | code | [JavaScript](../../source/6-ufc-consensus-picks-weighted/09-build-weighted-consensus.js) |  |
| 10 | Needs Explanations? | if |  |  |
| 11 | Generate Explanations | httpRequest | https://openrouter.ai/api/v1/chat/completions | onError=continueRegularOutput |
| 12 | Parse Explanations | code | [JavaScript](../../source/6-ufc-consensus-picks-weighted/12-parse-explanations.js) |  |
| 13 | Explanations OK? | if |  |  |
| 14 | Save Explanations | dataTable | upsert ufc_consensus_cache |  |
| 15 | Format Consensus | code | [JavaScript](../../source/6-ufc-consensus-picks-weighted/15-format-consensus.js) |  |
| 16 | Send Consensus | telegram | Telegram sendMessage |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Get Active Event | 0 |
| Get Active Event | main | 0 | Read Picks | 0 |
| Daily Digest Check | main | 0 | Get Active Event | 0 |
| Read Picks | main | 0 | Read Props | 0 |
| Read Props | main | 0 | Read Fight Analysis | 0 |
| Read Fight Analysis | main | 0 | Get Pick Grades | 0 |
| Get Pick Grades | main | 0 | Get Consensus Cache | 0 |
| Get Consensus Cache | main | 0 | Build Weighted Consensus | 0 |
| Build Weighted Consensus | main | 0 | Needs Explanations? | 0 |
| Needs Explanations? | main | 0 | Generate Explanations | 0 |
| Needs Explanations? | main | 1 | Format Consensus | 0 |
| Generate Explanations | main | 0 | Parse Explanations | 0 |
| Parse Explanations | main | 0 | Explanations OK? | 0 |
| Explanations OK? | main | 0 | Save Explanations | 0 |
| Explanations OK? | main | 1 | Format Consensus | 0 |
| Save Explanations | main | 0 | Format Consensus | 0 |
| Format Consensus | main | 0 | Send Consensus | 0 |

## Code and configuration

- `Build Weighted Consensus`: [source](../../source/6-ufc-consensus-picks-weighted/09-build-weighted-consensus.js)
- `Parse Explanations`: [source](../../source/6-ufc-consensus-picks-weighted/12-parse-explanations.js)
- `Format Consensus`: [source](../../source/6-ufc-consensus-picks-weighted/15-format-consensus.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
