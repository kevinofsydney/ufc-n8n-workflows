# UFC | 7. Grade Picks

Grade saved predictions against completed ESPN fight results and persist the historical record.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/PulwhLsIZhfvCGxl) · [Sanitized snapshot](../../workflows/7-grade-picks.json)

## Identity and version

- Workflow ID: `PulwhLsIZhfvCGxl`
- Published: `True`
- Published version: `5931bebc-95e7-49ae-ad85-ed8107db8ace`
- Draft version: `5931bebc-95e7-49ae-ad85-ed8107db8ace`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 24
- Timezone: `inherits instance timezone; not present in MCP snapshot`

## How it works

1. Choose the most recent eligible finished event with a spreadsheet. Treat start plus four hours as the initial eligibility gate; scheduled backfill excludes already graded events and events older than 180 days.
2. For on-demand /grade, optionally match event text and allow a regrade. Scheduled notifications are limited to events within three days; explicit requests notify.
3. Match an ESPN event around the stored event date, retrieve competition status, build fight results and upsert ufc_fight_results.
4. Exclude VOID rows, take the latest official winner pick per channel and fight, match fighters to results and grade CORRECT, INCORRECT, VOID or UNMATCHED.
5. Grade supported method, method-and-round, inside-distance, over/under rounds and duration props. Leave unsupported selections UNGRADED and unknown matches UNMATCHED.
6. Upsert pick/prop grade rows, update the event grading marker and send a scorecard when configured.

## Important behavior and limits

The four-hour gate alone does not prove all bouts finished; ESPN status and result matching remain necessary. Name matching uses normalized tokens and surnames. Read the grading source before changing rules such as exact over/under boundary behavior.

## Triggers and input contract

```json
[
  {
    "name": "Every 2 Hours",
    "type": "n8n-nodes-base.scheduleTrigger",
    "parameters": {
      "rule": {
        "interval": [
          {
            "field": "hours",
            "hoursInterval": 2
          }
        ]
      }
    }
  },
  {
    "name": "Grade On Demand",
    "type": "n8n-nodes-base.executeWorkflowTrigger",
    "parameters": {
      "inputSource": "passthrough"
    }
  }
]
```

Passthrough triggers accept caller JSON rather than enforcing a declared field schema. Inspect the linked validation/normalization code and caller mappings for runtime requirements. An omitted schedule field uses its n8n node default; see [schedules](../schedules.md).

## Connections to other workflows

Called by: [UFC | 5. Telegram Command Router](5-telegram-command-router.md) via `Run Grading`


Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Get Events | ufc_events | get |  |
| Save Fight Results | ufc_fight_results | upsert | event_key, espn_event_id, espn_competition_id, fighter_a, fighter_b, winner, method, method_detail, round, clock, elapsed_rounds, elapsed_minutes, scheduled_rounds, weight_class, recorded_at |
| Save Pick Grades | ufc_pick_grades | upsert | pick_id, event_key, channel_name, video_id, fight_order, fighter_a, fighter_b, picked_fighter, confidence_score, result, winner, graded_at |
| Save Prop Grades | ufc_prop_grades | upsert | prop_id, event_key, channel_name, video_id, fight_order, market, selection, recommendation_strength, result, graded_at |
| Mark Event Graded | ufc_events | update | graded_at |

Terminal nodes in the saved graph: `Send Grading Note`, `Send Scorecard`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | Every 2 Hours | scheduleTrigger |  |  |
| 2 | Get Events | dataTable | get ufc_events |  |
| 3 | Grade On Demand | executeWorkflowTrigger |  |  |
| 4 | Pick Event To Grade | code | [JavaScript](../../source/7-grade-picks/04-pick-event-to-grade.js) | executeOnce=False |
| 5 | Nothing To Grade? | if |  |  |
| 6 | Send Grading Note | telegram | Telegram sendMessage |  |
| 7 | Find ESPN Event | httpRequest | =https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard?dates={{ DateTime.fromISO($json.event_datetime_local).minus({ days: 1 }).toFormat('yyyyLLdd') }}-{{ DateTime.fromISO($json.event_datetime_local).plus({ days: 1 }).toFormat('yyyyLLdd') }} |  |
| 8 | Match ESPN Event | code | [JavaScript](../../source/7-grade-picks/08-match-espn-event.js) |  |
| 9 | Can Grade? | if |  |  |
| 10 | Get Fight Status | httpRequest | =https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc/events/{{ $json.espn_event_id }}/competitions/{{ $json.espn_competition_id }}/status | onError=continueRegularOutput |
| 11 | Build Fight Results | code | [JavaScript](../../source/7-grade-picks/11-build-fight-results.js) |  |
| 12 | Save Fight Results | dataTable | upsert ufc_fight_results |  |
| 13 | Read Picks | googleSheets | read Picks | alwaysOutputData=True, executeOnce=True |
| 14 | Read Props | googleSheets | read Props | alwaysOutputData=True, executeOnce=True |
| 15 | Grade Picks | code | [JavaScript](../../source/7-grade-picks/15-grade-picks.js) |  |
| 16 | Has Pick Rows? | if |  |  |
| 17 | Save Pick Grades | dataTable | upsert ufc_pick_grades |  |
| 18 | Grade Props | code | [JavaScript](../../source/7-grade-picks/18-grade-props.js) |  |
| 19 | Has Prop Rows? | if |  |  |
| 20 | Save Prop Grades | dataTable | upsert ufc_prop_grades |  |
| 21 | Mark Event Graded | dataTable | update ufc_events | executeOnce=True |
| 22 | Build Scorecard | code | [JavaScript](../../source/7-grade-picks/22-build-scorecard.js) |  |
| 23 | Should Notify? | if |  |  |
| 24 | Send Scorecard | telegram | Telegram sendMessage |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| Every 2 Hours | main | 0 | Get Events | 0 |
| Get Events | main | 0 | Pick Event To Grade | 0 |
| Grade On Demand | main | 0 | Get Events | 0 |
| Pick Event To Grade | main | 0 | Nothing To Grade? | 0 |
| Nothing To Grade? | main | 0 | Send Grading Note | 0 |
| Nothing To Grade? | main | 1 | Find ESPN Event | 0 |
| Find ESPN Event | main | 0 | Match ESPN Event | 0 |
| Match ESPN Event | main | 0 | Can Grade? | 0 |
| Can Grade? | main | 0 | Send Grading Note | 0 |
| Can Grade? | main | 1 | Get Fight Status | 0 |
| Get Fight Status | main | 0 | Build Fight Results | 0 |
| Build Fight Results | main | 0 | Save Fight Results | 0 |
| Save Fight Results | main | 0 | Read Picks | 0 |
| Read Picks | main | 0 | Read Props | 0 |
| Read Props | main | 0 | Grade Picks | 0 |
| Grade Picks | main | 0 | Has Pick Rows? | 0 |
| Has Pick Rows? | main | 0 | Save Pick Grades | 0 |
| Has Pick Rows? | main | 1 | Grade Props | 0 |
| Save Pick Grades | main | 0 | Grade Props | 0 |
| Grade Props | main | 0 | Has Prop Rows? | 0 |
| Has Prop Rows? | main | 0 | Save Prop Grades | 0 |
| Has Prop Rows? | main | 1 | Mark Event Graded | 0 |
| Save Prop Grades | main | 0 | Mark Event Graded | 0 |
| Mark Event Graded | main | 0 | Build Scorecard | 0 |
| Build Scorecard | main | 0 | Should Notify? | 0 |
| Should Notify? | main | 0 | Send Scorecard | 0 |

## Code and configuration

- `Pick Event To Grade`: [source](../../source/7-grade-picks/04-pick-event-to-grade.js)
- `Match ESPN Event`: [source](../../source/7-grade-picks/08-match-espn-event.js)
- `Build Fight Results`: [source](../../source/7-grade-picks/11-build-fight-results.js)
- `Grade Picks`: [source](../../source/7-grade-picks/15-grade-picks.js)
- `Grade Props`: [source](../../source/7-grade-picks/18-grade-props.js)
- `Build Scorecard`: [source](../../source/7-grade-picks/22-build-scorecard.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
