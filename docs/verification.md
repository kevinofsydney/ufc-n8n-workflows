# Documentation verification

## Scope and provenance

On 30 October 2026, n8n MCP search returned 28 UFC workflows. Full get_workflow_details responses were read for every one. Each was active/published and reported activeVersion.sameAsDraft=true. Ten referenced data-table schemas were exported; unrelated tables were excluded. No operational rows, transcripts, picks, credentials or execution histories are included.

The per-workflow pages document all **496 nodes**, every main/AI graph edge, direct child-workflow calls and wait settings, data-table reads/writes, credential names and exact trigger definitions. **124 Code-node files** are extracted without executing them. The human explanations cover each workflow's purpose, processing stages, important limits and relationships. The version/hash manifest links each page to its sanitized snapshot.

This task did not change or execute any n8n workflow. Reads and GitHub publication only were needed for documentation. A repository verification pass is not an end-to-end runtime test of all 28 workflows.

## Checks performed

- Inventory completeness against all 28 MCP search results, with one guide/snapshot per workflow.
- Snapshot SHA-256 hashes, node counts, valid JSON and matching workflow IDs.
- Every named graph endpoint exists; static child/tool workflow references resolve within the snapshot set.
- Every exported Code node has an exact source file and parses as JavaScript without being executed.
- Relative Markdown file links resolve locally.
- Workflow/source scans for common API-key/token patterns, literal authentication secrets, credential IDs/values and prohibited operational/pinned data. A separate pre-publication sweep removes owner identifiers, private resource locators and account-specific URLs; see the privacy review.
- Private GitHub repository visibility and pushed commit verification.

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
- Separate first-class n8n Agent artifacts, actual credentials, template/data files, instance settings and historical executions are not backed up here.
