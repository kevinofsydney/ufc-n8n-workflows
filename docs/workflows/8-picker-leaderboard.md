# UFC | 8. Picker Leaderboard

Report the all-time picker leaderboard from saved grades.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/YeYpgLGiYlzCTopn) · [Sanitized snapshot](../../workflows/8-picker-leaderboard.json)

## Identity and version

- Workflow ID: `YeYpgLGiYlzCTopn`
- Published: `True`
- Published version: `33dc9383-03e7-4535-b937-d7af6fb61bfe`
- Draft version: `33dc9383-03e7-4535-b937-d7af6fb61bfe`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 5
- Timezone: `inherits instance timezone; not present in MCP snapshot`

## How it works

1. Read ufc_pick_grades and ufc_prop_grades.
2. Aggregate correct/incorrect outcomes, high-confidence performance and prop results by channel.
3. Require at least 15 winner picks to rank a picker; high confidence uses score seven or above. Format and send the Telegram leaderboard.

## Important behavior and limits

This reads historical grades rather than calling ESPN, capture or an LLM. Missing/ungraded/void outcomes should not be interpreted as losses; the source code defines the denominators.

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

Called by: [UFC | 5. Telegram Command Router](5-telegram-command-router.md) via `Run Leaderboard`


Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Get Pick Grades | ufc_pick_grades | get |  |
| Get Prop Grades | ufc_prop_grades | get |  |

Terminal nodes in the saved graph: `Send Leaderboard`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Get Pick Grades | dataTable | get ufc_pick_grades | alwaysOutputData=True |
| 3 | Get Prop Grades | dataTable | get ufc_prop_grades | alwaysOutputData=True, executeOnce=True |
| 4 | Build Leaderboard | code | [JavaScript](../../source/8-picker-leaderboard/04-build-leaderboard.js) |  |
| 5 | Send Leaderboard | telegram | Telegram sendMessage |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| When Called | main | 0 | Get Pick Grades | 0 |
| Get Pick Grades | main | 0 | Get Prop Grades | 0 |
| Get Prop Grades | main | 0 | Build Leaderboard | 0 |
| Build Leaderboard | main | 0 | Send Leaderboard | 0 |

## Code and configuration

- `Build Leaderboard`: [source](../../source/8-picker-leaderboard/04-build-leaderboard.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
