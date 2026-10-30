# Workflow interfaces

Each workflow page includes the exact trigger/input definition and caller list. Explicit workflowInputs are schema-enforced by n8n. Passthrough triggers depend on runtime validation; the examples below show the main contracts, not permission to execute them in production.

## Event services

Spreadsheet/card services normally receive one event object containing at least:

```json
{"event_key":"event-slug","event_name":"UFC Event: Fighter A vs Fighter B","event_datetime_local":"2026-11-01T00:00:00.000Z","spreadsheet_id":"EVENT_SPREADSHEET_ID","spreadsheet_url":"https://docs.google.com/spreadsheets/d/EVENT_SPREADSHEET_ID/edit"}
```

`ensure_event_spreadsheet` can begin with an event_key and retrieve canonical stored details, including an absent sheet reference that it needs to create. Services validate different requirements; source validators are the authority. They usually return the event plus card/schema/sync/change metadata. Preserve all passthrough fields between stages.

## Router request

```json
{"command":"videos","chat_id":0,"args":"2","callback_id":""}
```

The router derives this from a Telegram message/callback. It preserves argument case while normalizing the first command token and optional bot suffix. Do not send another chat ID expecting services to override owner restrictions.

For `/fixed`, the router maps the first argument to `incident` and the remainder to `resolution`. For `/issue`, it maps the note into the issue recorder. Read each executeWorkflow node's workflowInputs for exact field mapping; not every service consumes the generic router object directly.

## Single-video worker target

```json
{"manual_retry":true,"target_video_id":"GJCHwP-gkEE","target_video_row":{"video_id":"GJCHwP-gkEE","event_key":"event-slug","video_title":"UFC Event Predictions","channel_name":"Channel","attempt_count":1}}
```

This is the internal capture/analysis target contract used after validation/reservation. It is not a stand-alone external ingestion endpoint. Capture checks event identity, saved row and title classification; analysis filters to the target. The target_video_row must be the actual validated saved record, with the worker-required fields. Do not fabricate it to skip the reservation process.

## Add-video and video browser

`svc.add_video` receives owner chat_id and args containing a supported public YouTube URL, plus optional dry_run. Its manual trigger injects the test URL and dry_run=true. A dry run is a validation path, not an end-to-end transcript/model test.

`svc.browse_videos` receives command `videos` or `video`, owner chat_id and args. `videos` accepts a positive page. `video` accepts VIDEO_ID, optional summary page and optional originating list page. Both are read-only views of active-event saved data.

## Incident service schemas

| Service | Declared input fields |
| --- | --- |
| list_incidents_to_diagnose | claimer (`agent`, `workflow`, `manual`), incident_key, older_than_minutes, dry_run |
| diagnose_incident | incident_key, older_than_minutes, dry_run |
| read_execution | workflow_id, execution_id, node_names, max_chars |
| record_diagnosis | incident_key, diagnosed_by, summary, root_cause, evidence, affected, proposed_fix, needs_human, human_steps, confidence, dry_run |
| record_issue | note, severity, workflow_name, workflow_id, category, dry_run |
| list_issues | dry_run |
| resolve_incident | incident, resolution, fixed_in_version, dry_run |

`confidence` for diagnosis is high/medium/low; needs_human is boolean. The parser and recorder enforce/normalize the exact output. Source JSON/code contains the full contract and notification gates.

## Wait, dispatch and returned data

With waitForSubWorkflow=true, the caller proceeds after the child finishes and receives its returned items. With false, the call queues a separate execution and an acknowledgement cannot establish the child's eventual result. Dynamic retry dispatch and router capture/analysis/grading use this asynchronous pattern.

Workflows can have multiple terminal branches, including notifications and ledger writes. A list of terminal nodes is not itself a stable public API. The caller's next node, named-node lookups and child output code establish what is consumed. The repository exports those exact expressions and graph edges so changes can be traced across both sides.

Dry-run support is per workflow and per gate. Do not assume an arbitrary dry_run field prevents every called service, HTTP request, claim or notification. Inspect its entire path before using it as a safety guarantee.
