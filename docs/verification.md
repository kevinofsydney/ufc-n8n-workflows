# Documentation verification

## Scope and provenance

On 2 November 2026, n8n MCP search returned 28 UFC workflows. Full get_workflow_details responses were read for every one. Each was active/published and reported activeVersion.sameAsDraft=true. Ten referenced data-table schemas were exported; unrelated tables were excluded. No operational rows, transcripts, picks, credentials or execution histories are included.

The per-workflow pages document all **510 nodes**, every main/AI graph edge, direct child-workflow calls and wait settings, data-table reads/writes, credential names and exact trigger definitions. **129 Code-node files** are extracted without executing them. The human explanations cover each workflow's purpose, processing stages, important limits and relationships. The version/hash manifest links each page to its sanitized snapshot.

The original documentation task did not change or execute n8n workflows. The subsequent Shorts-filter change did update and publish capture, analysis and add-video; its controlled tests and behavior are recorded in the [Shorts policy](shorts-filter.md). A repository verification pass is not an end-to-end runtime test of all 28 workflows.

## Changes since the first capture

Eight workflows changed after the 30 October capture; the other 20 kept the same published versions.

| Workflow | Change | Evidence |
| --- | --- | --- |
| 4. Add New UFC Events | Updating an existing event no longer overwrites event_key | Published 1 November; event row, card state and video rows share the original key |
| svc.populate_fight_card | Slug fallback for an empty data-fmid; one-fighter matching for a renamed opponent | Failing executions 3331 and 3359, then successful 3364 with a READY 14-bout card |
| svc.record_diagnosis | Invalid input returns ok:false instead of throwing | Failing executions 3347, 3350 and 3353, then executions 3369 and 3370 |
| svc.detect_card_changes | Card builder matches svc.populate_fight_card | Local simulation with inputs captured by execution 3359, then production execution 3556, which verified the card and adopted its 14 bout IDs into an empty sheet column |
| svc.sync_bout_ids | Slug-based ufc: IDs can upgrade to numeric UFC IDs | Local fixtures for the upgrade, the no-op and refused changes. Production execution 3558 ran successfully, but UFC still served no data-fmid, so the upgrade itself has not run live |
| svc.apply_card_changes | A main event waiting to leave stays on as main_card, so a replacement applies at once | Simulated a full swap with live card data; before the change it threw while the old bout was waiting. No live swap has occurred since |
| 2. Extract Picker Video Transcripts | Tracks DFS by the Numbers as the fourteenth channel | Production execution 3560 checked all 14 channels and captured its video; analysis execution 3563 completed it |
| 4. Add New UFC Events | Runs daily and sends a Telegram message when an event is renamed | Pinned-data execution 3545 routed a renamed item to the alert and an unchanged item away from it; production execution 3546 sent no false alert. No live rename has occurred since |

## Checks performed

- Inventory completeness against all 28 MCP search results, with one guide/snapshot per workflow.
- Snapshot SHA-256 hashes, node counts, valid JSON and matching workflow IDs.
- Every named graph endpoint exists; static child/tool workflow references resolve within the snapshot set.
- Every exported Code node has an exact source file and parses as JavaScript without being executed.
- Relative Markdown file links resolve locally.
- Workflow/source scans for common API-key/token patterns, literal authentication secrets, credential IDs/values and prohibited operational/pinned data. A separate pre-publication sweep removes owner identifiers, private resource locators and account-specific URLs; see the privacy review.
- Public GitHub repository visibility and pushed commit verification.

Run `python3 scripts/verify-docs.py` for repeatable local checks. It requires Python 3 and Node.js and does not contact live services. It is a consistency/secret-pattern check, not a guarantee that every future secret format is detectable. Review staged changes before publishing.

## Relevant prior runtime evidence

Before this documentation task, the YouTube API migration was exercised against the live capture workflow. Credential test 2770 resolved all 13 channels. Full capture execution 2771 checked every channel, found eleven eligible current-event videos and captured the new JakeGerberMMA video `iyeMtl78dZs`. Artem MMA video `GJCHwP-gkEE` was present and skipped as already recorded. Telegram message 423 confirmed capture. Repeat execution 2777 created no duplicate capture and Telegram message 424 explicitly reported no new eligible videos, with 13 channels checked. The existing local feature suites passed 133 tests at that point.

Those historical tests substantiate the recent ingestion change; they do not certify every grading, card-change, diagnosis or recovery path. They are not replayed by the documentation verifier, and their legacy work directories are excluded from this repository.

## Known limits recorded from the source

- Several schedules inherit an instance timezone absent from the MCP snapshots.
- Capture and analysis are separate workers; acknowledgements are not completion results.
- Multi-table/sheet state changes are not a single transaction. Verification signals/read-back differ by service.
- Automatic failure retry uses empty input and need not preserve the exact original manual target.
- Recent sibling-alert suppression does not compare error signatures across workflows.
- Quiet/error retry resolution includes time-based inferences; diagnosis does not apply fixes.
- Claim/reservation mechanisms reduce duplication, but a global transaction/lock across all workers is not established.
- svc.detect_card_changes keeps its own copy of the svc.populate_fight_card card builder; a change to one must be applied to the other.
- A card check that returns UNAVAILABLE is not alerted, so change detection can stop without an incident.
- The ESPN spelling recorded for a renamed opponent is replaced by verified profile nicknames before the Fight Card is written.
- Separate first-class n8n Agent artifacts, actual credentials, template/data files, instance settings and historical executions are not backed up here.
