# UFC | 9. OpenRouter Balance

Answer credit-balance requests and monitor OpenRouter credit availability.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/f2CKNtQUpZ5Rm80Z) · [Sanitized snapshot](../../workflows/9-openrouter-balance.json)

## Identity and version

- Workflow ID: `f2CKNtQUpZ5Rm80Z`
- Published: `True`
- Published version: `e962135f-653e-44e7-bb88-36345cffb380`
- Draft version: `e962135f-653e-44e7-bb88-36345cffb380`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 12
- Timezone: `Australia/Sydney`

## How it works

1. Read the openrouter row in ufc_monitor_state and distinguish a scheduled check from an explicit request.
2. Query /api/v1/credits and /api/v1/key with the stored OpenRouter credential.
3. Prefer account credits when permission allows; otherwise use the available key limit/usage information and label the source.
4. Save the check, remaining balance and status. Notify according to Format Balance; default threshold is USD 5 and successful low-credit deliveries update last_alerted_at.

## Important behavior and limits

The explicit schedule timezone is Australia/Sydney at 09:00 and 21:00. Key-limited credit information is not necessarily the whole-account balance. A missing balance is unknown, not zero.

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
    "name": "Check Credit Morning and Evening",
    "type": "n8n-nodes-base.scheduleTrigger",
    "parameters": {
      "rule": {
        "interval": [
          {
            "field": "cronExpression",
            "expression": "0 9,21 * * *"
          }
        ]
      }
    }
  }
]
```

Passthrough triggers accept caller JSON rather than enforcing a declared field schema. Inspect the linked validation/normalization code and caller mappings for runtime requirements. An omitted schedule field uses its n8n node default; see [schedules](../schedules.md).

## Connections to other workflows

Called by: [UFC | 5. Telegram Command Router](5-telegram-command-router.md) via `Run Credits`


Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Read Credit Monitor State | ufc_monitor_state | get |  |
| Save Credit Monitor Check | ufc_monitor_state | upsert | monitor_key, threshold_usd, last_checked_at, remaining_usd, balance_source, status, last_alerted_at |
| Record Credit Alert Delivery | ufc_monitor_state | update | last_alerted_at |

Terminal nodes in the saved graph: `Record Credit Alert Delivery`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | When Called | executeWorkflowTrigger |  |  |
| 2 | Get Credits | httpRequest | https://openrouter.ai/api/v1/credits | onError=continueRegularOutput |
| 3 | Get Key Info | httpRequest | https://openrouter.ai/api/v1/key | onError=continueRegularOutput, executeOnce=True |
| 4 | Format Balance | code | [JavaScript](../../source/9-openrouter-balance/04-format-balance.js) |  |
| 5 | Send Balance | telegram | Telegram sendMessage |  |
| 6 | Check Credit Morning and Evening | scheduleTrigger |  |  |
| 7 | Read Credit Monitor State | dataTable | get ufc_monitor_state |  |
| 8 | Prepare Balance Request | code | [JavaScript](../../source/9-openrouter-balance/08-prepare-balance-request.js) |  |
| 9 | Save Credit Monitor Check | dataTable | upsert ufc_monitor_state |  |
| 10 | Balance Reply Needed? | if |  |  |
| 11 | Low Credit Alert Delivered? | if |  |  |
| 12 | Record Credit Alert Delivery | dataTable | update ufc_monitor_state |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| Get Credits | main | 0 | Get Key Info | 0 |
| Get Key Info | main | 0 | Format Balance | 0 |
| When Called | main | 0 | Read Credit Monitor State | 0 |
| Check Credit Morning and Evening | main | 0 | Read Credit Monitor State | 0 |
| Read Credit Monitor State | main | 0 | Prepare Balance Request | 0 |
| Prepare Balance Request | main | 0 | Get Credits | 0 |
| Format Balance | main | 0 | Save Credit Monitor Check | 0 |
| Save Credit Monitor Check | main | 0 | Balance Reply Needed? | 0 |
| Balance Reply Needed? | main | 0 | Send Balance | 0 |
| Send Balance | main | 0 | Low Credit Alert Delivered? | 0 |
| Low Credit Alert Delivered? | main | 0 | Record Credit Alert Delivery | 0 |

## Code and configuration

- `Format Balance`: [source](../../source/9-openrouter-balance/04-format-balance.js)
- `Prepare Balance Request`: [source](../../source/9-openrouter-balance/08-prepare-balance-request.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
