# Operations and recovery

## Normal event cycle

1. Workflow 4 discovers upcoming events. Confirm the next event exists in ufc_events with the right source URL and timestamp.
2. Workflow 1 marks the next future event active. The shared spreadsheet service reuses or creates its file and populates its Fight Card.
3. Capture discovers eligible videos and stores English transcript parts. Check its final summary for capture counts, retries and incomplete channel scans.
4. Analysis checks the card/schema, extracts saved transcripts and sends picks summaries. Use `/videos` to revisit a specific result and `/status` for pipeline state.
5. Use `/consensus` for the active event. The scheduled digest only sends inside its pre-event window.
6. After the event, grading retrieves results and saves grades. `/leaderboard` reads those grades across events.
7. Monitor `/issues` and credit alerts. Diagnosis messages propose actions; they do not deploy fixes.

## Setup and external dependencies

The [credential reference](credentials.md) lists actual credential names/types and their workflow usage. Required services include Telegram, Google Drive/Sheets, Supadata, YouTube Data API, OpenRouter and the n8n MCP endpoint used by diagnostics. Exa is used by diagnosis search. Official UFC pages and ESPN endpoints supply event/card/result data.

The Supadata node is a community integration (`n8n-nodes-supadata.supadata`) and must exist on a target instance. AI diagnostic nodes use `@n8n/n8n-nodes-langchain`. The snapshots preserve node versions; importing into another n8n version requires validation, not an assumption of compatibility.

For YouTube, the current credential is Query Auth named **httpQueryAuth credential**, with parameter name `key` and its secret value stored in n8n. It is applied to authenticated GETs at the channels and playlistItems endpoints. The key must permit YouTube Data API v3 access from the n8n server. Its secret is absent from this repository.

Google credentials need access to the configured template, destination folder and event spreadsheets. Template/folder locators are in ensure_event_spreadsheet and workflow notes. The template's actual spreadsheet contents are not backed up here. Recreate the exact contract, including adequate grid width, before starting analysis on a clone.

The Telegram owner ID is configured in multiple router/service/code locations, not a single global variable. A clone needs a deliberate search/rebind across snapshots and code. A Telegram bot webhook should have one owning trigger workflow; publishing a clone with the same bot can interfere with the existing deployment.

## Schedules and costs

See [exact schedules](schedules.md). Several core workflows inherit an instance timezone not present in the MCP snapshot. The credit monitor and several services explicitly set Australia/Sydney. Confirm the instance default before interpreting inherited wall-clock times.

YouTube discovery normally needs one channels request plus playlist page requests for each channel. The verified migration scan used 26 reads: one channels request and 25 playlist pages across 13 channels. The configured maximum is 131 requests per scan before HTTP retries. More uploads or missing dates can increase page depth; a safety-cap hit is reported incomplete.

YouTube metadata quota, Supadata caption usage and OpenRouter model costs are separate. This repository records observed configuration rather than current vendor prices or guaranteed spend. Analysis logs store model/token/cost information; consensus caches explanations; the video browser reuses saved rows and does not call a model. Diagnosis can also spend OpenRouter/Exa usage independently of prediction analysis.

## Troubleshooting

| Symptom | Check first | Next action |
| --- | --- | --- |
| Capture acknowledged but no visible result | Worker execution, ufc_pipeline_runs state/finished_at and final Telegram summary | Distinguish async dispatch, idle, incomplete scan and stuck run |
| Expected video missing | Current title/date/event filters, channel uploads response, ufc_videos row and retry state | `/addvideo URL` for a new matching public video; `/retry` for an unfinished saved one |
| All/partial YouTube channels fail | HTTP execution outputs, stored credential, API enablement/restrictions and quota | Fix the actual API error; handled errors can still yield a successful platform execution |
| Transcript unavailable | Supadata returned language/content, available languages, attempts and last_error | Allow five-hour automatic retry interval or make a deliberate owner retry |
| Captured but not analysed | analysis_status, analysis schedule and extraction log | `/analyse` or a targeted unfinished `/retry analyse ID`; capture alone does not chain analysis |
| Analysis repeatedly PROCESSING | last_attempt_at, execution ID, write branches | Worker stale threshold is one hour; health alert threshold is three hours; inspect partial writes before retry |
| Schema/card validation stops analysis | Exact thrown error, saved sheet headers, UFC/ESPN data and card state | Preserve the safeguard; correct the mismatch/source or apply a justified repair |
| Wrong UFC page/card | Source URL, event timestamp, US-region cookie, external page contents | Compare official UFC and ESPN evidence before modifying stored data |
| Card change pending | pending_change_json, confirmation state and NEEDS_REVIEW | Inspect removal/replacement evidence; more than three removals requires review |
| Summary hard to find | `/videos` then video title | Opens saved analysis without a new extraction charge |
| Leaderboard/consensus looks stale | Saved grade/extraction timestamps, void markers and latest-per-channel rules | Grading/analysis produce the data; the view does not repair upstream work |
| An incident says resolved but issue persists | resolution text/source and later execution evidence | Quiet-period closure is an inference; record/reopen an owner issue if needed |

## Testing and publishing a change

Read the current live and published versions first, then save a local pre-change snapshot. Draft changes and published execution can differ; nested executeWorkflow calls can still invoke published children during a manual parent test.

Validate node configurations, connections and workflow groups. Test transformations with fixtures before exercising external writes. Prefer read-only HTTP/metadata tests for credentials. For live validation, choose a concrete event/video and inspect the resulting table rows, sheet writes, run state and Telegram delivery, then repeat where appropriate to check deduplication. Clean up dummy rows/files/messages that the test intentionally created; retain genuine production captures only when that is the desired outcome.

Do not rely on a generic dry_run flag as a universal no-write guarantee. Several services implement it individually. Trace every downstream gate first. Error Trigger behavior also differs between production and manual tests.

Publish only the intended validated version and verify activeVersionId afterward. Keep the previous snapshot for rollback. A version rollback restores workflow logic; it does not undo sheet/table changes or external messages.

## Restore or clone

1. Keep this snapshot repository and obtain separate authorized backups of the data tables, event/template spreadsheets and credentials. This repository contains schemas/configuration, not the actual operational data.
2. Prepare a compatible n8n instance with required node packages. Create the ten data tables from the schema reference and record their new IDs.
3. Import workflows in an unpublished state. Treat exports as reference configuration requiring adaptation; MCP snapshots are not a promise of a turnkey n8n UI import on every release. Retain full nodes/connections/settings when converting to an import payload.
4. Rebind credential references by name, template/folder/file IDs, table IDs, instance URLs, owner chat IDs and workflow IDs. Include dynamic IDs inside Code nodes, Agent tool references and settings.errorWorkflow. Do not assume imported IDs will be preserved.
5. Recreate/restore the Google template and event sheets with their full headers, identity columns and grid width. Restore the event/video/grade/card/incident data only as deliberately required. Confirm exactly one active event and its correct sheet reference.
6. Validate and test shared spreadsheet/card services, then capture/analysis, then views/grading and diagnostic services. Test real sources with a controlled target and duplicate checks before enabling schedules.
7. Publish the shared error handler before assigning it as errorWorkflow on callers. Publish child services and workers before enabling router/schedules that use them. Bind a separate Telegram test bot while verifying a clone.
8. Enable the intended production schedules/router, confirm timezone behavior and inspect first completion/health messages. Avoid simultaneous production ownership by the old and new instance.

For rollback on the same instance, use n8n version history or apply a known previous graph to a draft, validate, publish that chosen version and verify it. Inspect all data side effects separately.

## Refresh this repository

1. Use the n8n MCP workflow search to inventory every UFC workflow. Retrieve full get_workflow_details results and data-table schemas. Store workflow responses locally at `.private/workflows/WORKFLOW_ID.json` and the search_data_tables structured result at `.private/tables.json`. These inputs are ignored by Git.
2. Check activeVersion.sameAsDraft. If false, decide whether documenting the published or draft graph, and update the generator/provenance language accordingly; the current generator is for this verified matching snapshot. Update the expected inventory count when workflows change.
3. Update `scripts/workflow-descriptions.json` after reading changed code and caller contracts. The generator preserves exact references but cannot write an accurate new behavioral explanation by itself.
4. Run `python3 scripts/build-docs.py`, review the diff and update narrative architecture/operations pages. Remove obsolete generated files deliberately if workflows/nodes were renamed; the generator does not automatically delete old paths.
5. Run `python3 scripts/verify-docs.py`. Review staged files and secret-scan results. Commit and push only the intended documentation, source and sanitized snapshots.

The snapshot date in the generator and narrative pages must be updated on a new capture. Do not regenerate stale local inputs and label them as freshly read live state.
