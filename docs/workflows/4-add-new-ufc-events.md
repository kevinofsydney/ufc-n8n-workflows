# UFC | 4. Add New UFC Events

Maintain the event catalogue by scraping the official UFC upcoming-events page.

[Workflow catalogue](../workflows.md) · [Open in n8n](https://N8N_INSTANCE.example/workflow/MWmlPIyBDUKoheXO) · [Sanitized snapshot](../../workflows/4-add-new-ufc-events.json)

## Identity and version

- Workflow ID: `MWmlPIyBDUKoheXO`
- Published: `True`
- Published version: `f3f0c1ec-a566-43a4-867b-0f5db65e2057`
- Draft version: `f3f0c1ec-a566-43a4-867b-0f5db65e2057`
- Snapshot: 2026-10-30. Published graph matched draft when read.
- Nodes: 12
- Timezone: `inherits instance timezone; not present in MCP snapshot`

## How it works

1. Fetch ufc.com/events with browser headers and STYXKEY_region=USA.US.en.Default to select the US English edition.
2. Extract individual event entries, normalize names, URLs, dates and event keys, then filter eligible events.
3. Compare against ufc_events, update existing event metadata or insert new rows, and send a Telegram notification for newly added events.

## Important behavior and limits

The US-region cookie is intentional because the n8n hosting region can otherwise receive another edition. This workflow discovers events; workflow 1 decides which one is active. Scraper selectors and date normalization depend on the current UFC site.

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
              4
            ],
            "triggerAtHour": 12
          }
        ]
      }
    }
  }
]
```

Passthrough triggers accept caller JSON rather than enforcing a declared field schema. Inspect the linked validation/normalization code and caller mappings for runtime requirements. An omitted schedule field uses its n8n node default; see [schedules](../schedules.md).

## Connections to other workflows

Called by: No static caller in the exported workflows; entry may be scheduled, external, dynamic or error-driven.


Configured error handler: [UFC | svc.alert_failure](svc-alert-failure.md). See [monitoring](../monitoring.md) for production Error Trigger behavior.

## Data access and output

| Node | Table | Operation | Written fields |
| --- | --- | --- | --- |
| Find Existing UFC Event | ufc_events | get |  |
| Update Existing UFC Event | ufc_events | update | source_event_id, event_key, event_name, event_datetime_local |
| Insert New UFC Event | ufc_events | insert | source_event_id, event_key, event_name, event_datetime_local, active, created_at |

Terminal nodes in the saved graph: `Update Existing UFC Event`, `Telegram — UFC Event Added`. Terminal nodes include notifications and parallel branches; not every terminal is the sub-workflow return contract. Caller wait settings and worker result code determine how outputs are consumed.

## Node reference

| # | Node | Type | Action / source | Execution settings |
| --- | --- | --- | --- | --- |
| 1 | Schedule Trigger | scheduleTrigger |  |  |
| 2 | HTTP Request | httpRequest | https://www.ufc.com/events |  |
| 3 | Extract HTML Content | html | extractHtmlContent |  |
| 4 | Split Out | splitOut |  |  |
| 5 | Parse Individual UFC Event | html | extractHtmlContent |  |
| 6 | Normalise and Filter UFC Events | code | [JavaScript](../../source/4-add-new-ufc-events/06-normalise-and-filter-ufc-events.js) |  |
| 7 | Find Existing UFC Event | dataTable | get ufc_events | alwaysOutputData=False |
| 8 | Event Already Exists? | if |  |  |
| 9 | Update Existing UFC Event | dataTable | update ufc_events |  |
| 10 | Telegram — UFC Event Added | telegram | Telegram sendMessage |  |
| 11 | Classify UFC Events | code | [JavaScript](../../source/4-add-new-ufc-events/11-classify-ufc-events.js) |  |
| 12 | Insert New UFC Event | dataTable | insert ufc_events |  |

## Exact graph edges

Main output indexes are zero-based. If outputs 0/1 mean true/false for an If node; Switch indexes follow the rule order in the snapshot. AI model/tool/parser edges configure the Agent rather than executing as the next main step.

| From | Connection | Output | To | Input |
| --- | --- | --- | --- | --- |
| Schedule Trigger | main | 0 | HTTP Request | 0 |
| HTTP Request | main | 0 | Extract HTML Content | 0 |
| Extract HTML Content | main | 0 | Split Out | 0 |
| Split Out | main | 0 | Parse Individual UFC Event | 0 |
| Parse Individual UFC Event | main | 0 | Normalise and Filter UFC Events | 0 |
| Normalise and Filter UFC Events | main | 0 | Find Existing UFC Event | 0 |
| Find Existing UFC Event | main | 0 | Classify UFC Events | 0 |
| Event Already Exists? | main | 0 | Update Existing UFC Event | 0 |
| Event Already Exists? | main | 1 | Insert New UFC Event | 0 |
| Classify UFC Events | main | 0 | Event Already Exists? | 0 |
| Insert New UFC Event | main | 0 | Telegram — UFC Event Added | 0 |

## Code and configuration

- `Normalise and Filter UFC Events`: [source](../../source/4-add-new-ufc-events/06-normalise-and-filter-ufc-events.js)
- `Classify UFC Events`: [source](../../source/4-add-new-ufc-events/11-classify-ufc-events.js)

Full parameter expressions, sheet ranges, table filters, prompt/schema definitions and credential names are in the sanitized JSON snapshot. Credential IDs and values, webhook IDs, execution data and pinned data are excluded. Rebind credentials and environment-specific resources before importing. [Restore procedure](../operations.md#restore-or-clone).
