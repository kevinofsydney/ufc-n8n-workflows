# Workflow catalogue

All 28 UFC workflows visible through MCP were read directly from the live instance on 2026-10-30. Every workflow was published and its published graph matched its current draft. This is a point-in-time reference, not automatic synchronization.

| Workflow | Nodes | Purpose |
| --- | --- | --- |
| [UFC \| 1. Set Active UFC Event (Sunday nights)](workflows/1-set-active-ufc-event-sunday-nights.md) | 10 | Select the next future UFC event and make it the single active event used by capture, analysis and Telegram views. |
| [UFC \| 2. Extract Picker Video Transcripts](workflows/2-extract-picker-video-transcripts.md) | 57 | Discover eligible prediction videos for the active event and save English transcript chunks to its spreadsheet. |
| [UFC \| 3. Analyse Picker Video Transcripts](workflows/3-analyse-picker-video-transcripts.md) | 69 | Turn captured transcripts into structured winner picks, props and fight reasoning while preserving event and fight identity. |
| [UFC \| 4. Add New UFC Events](workflows/4-add-new-ufc-events.md) | 12 | Maintain the event catalogue by scraping the official UFC upcoming-events page. |
| [UFC \| 5. Telegram Command Router](workflows/5-telegram-command-router.md) | 29 | Provide the owner-only Telegram command and inline-button entry point for the system. |
| [UFC \| 6. UFC Consensus Picks (weighted)](workflows/6-ufc-consensus-picks-weighted.md) | 16 | Aggregate saved official picks into a weighted consensus and optionally explain each bout. |
| [UFC \| 7. Grade Picks](workflows/7-grade-picks.md) | 24 | Grade saved predictions against completed ESPN fight results and persist the historical record. |
| [UFC \| 8. Picker Leaderboard](workflows/8-picker-leaderboard.md) | 5 | Report the all-time picker leaderboard from saved grades. |
| [UFC \| 9. OpenRouter Balance](workflows/9-openrouter-balance.md) | 12 | Answer credit-balance requests and monitor OpenRouter credit availability. |
| [UFC \| svc.add_video](workflows/svc-add-video.md) | 25 | Capture and analyse one owner-submitted public YouTube video from /addvideo. |
| [UFC \| svc.alert_failure](workflows/svc-alert-failure.md) | 15 | Record production workflow failures as incidents, suppress repeat alerts and retry selected transient failures. |
| [UFC \| svc.apply_card_changes](workflows/svc-apply-card-changes.md) | 26 | Apply eligible recorded Fight Card changes and queue affected videos for re-analysis. |
| [UFC \| svc.auto_resolve_incidents](workflows/svc-auto-resolve-incidents.md) | 6 | Close quiet error incidents on a time-based rule. |
| [UFC \| svc.browse_videos](workflows/svc-browse-videos.md) | 26 | Browse captured event videos and reopen saved analysis summaries in Telegram. |
| [UFC \| svc.check_event_spreadsheet](workflows/svc-check-event-spreadsheet.md) | 10 | Check the event spreadsheet contract before analysis without changing sheet data. |
| [UFC \| svc.detect_card_changes](workflows/svc-detect-card-changes.md) | 12 | Detect differences between the saved Fight Card and the current official card. |
| [UFC \| svc.diagnose_incident](workflows/svc-diagnose-incident.md) | 12 | Investigate eligible incidents using a bounded AI diagnosis workflow and save the findings. |
| [UFC \| svc.ensure_event_spreadsheet](workflows/svc-ensure-event-spreadsheet.md) | 13 | Return a valid event spreadsheet, reusing an existing copy before creating a new one. |
| [UFC \| svc.health_sweep](workflows/svc-health-sweep.md) | 14 | Detect silent pipeline problems and maintain health incidents every 30 minutes. |
| [UFC \| svc.list_incidents_to_diagnose](workflows/svc-list-incidents-to-diagnose.md) | 7 | Choose and claim incidents for diagnosis so concurrent diagnosers can coordinate. |
| [UFC \| svc.list_issues](workflows/svc-list-issues.md) | 5 | Send a readable list of open and recently resolved incidents. |
| [UFC \| svc.populate_fight_card](workflows/svc-populate-fight-card.md) | 40 | Build a verified Fight Card for an empty event sheet while protecting existing extraction. |
| [UFC \| svc.read_execution](workflows/svc-read-execution.md) | 3 | Return compact read-only execution evidence for diagnosers. |
| [UFC \| svc.record_diagnosis](workflows/svc-record-diagnosis.md) | 7 | Persist a diagnosis and send the owner a consistently formatted diagnosis message. |
| [UFC \| svc.record_issue](workflows/svc-record-issue.md) | 11 | Record an owner-reported issue in the same incident system used for pipeline failures. |
| [UFC \| svc.resolve_incident](workflows/svc-resolve-incident.md) | 9 | Mark a selected incident resolved with an owner-supplied resolution. |
| [UFC \| svc.retry_video](workflows/svc-retry-video.md) | 12 | Accept a targeted owner retry for one unfinished active-event video. |
| [UFC \| svc.sync_bout_ids](workflows/svc-sync-bout-ids.md) | 18 | Give bouts stable identities and align spreadsheet references to those identities. |
