# Workflow call graph

Solid edges are explicit child-workflow/tool calls in the saved configuration. Dashed edges are the validated dynamic retry targets. Shared tables and sheets create additional data dependencies; they are described in the architecture guide. Error-handler links are documented per workflow and omitted here to keep the diagram readable.

```mermaid
flowchart LR
  wBvLnPFMwQ2vhPkgv["3. Analyse Picker Video Transcripts"]
  wG1EMMFVSzpGE4q3Q["svc.retry_video"]
  wGQs7zaGeF1vZBRaj["svc.check_event_spreadsheet"]
  wIodUUBrjWAVd0cHi["svc.browse_videos"]
  wJcNXgWql9K4RrHm9["svc.add_video"]
  wLuALxCWYzByUY2Iq["svc.ensure_event_spreadsheet"]
  wMWmlPIyBDUKoheXO["4. Add New UFC Events"]
  wMabSJBF0Vt6sMICp["5. Telegram Command Router"]
  wPulwhLsIZhfvCGxl["7. Grade Picks"]
  wSBBK0hOGx2uPYpm4["svc.populate_fight_card"]
  wSkWzi2pqLtbW4HNN["svc.list_issues"]
  wSrL8ScYMIBiJ9Gki["svc.alert_failure"]
  wUB711gFJFn9OuZwb["svc.diagnose_incident"]
  wUDRrGRyeFPL9Lk3S["svc.detect_card_changes"]
  wVkgPostfkMxFPWj6["6. UFC Consensus Picks (weighted)"]
  wXN5zvwsajUldmPgN["svc.resolve_incident"]
  wYeYpgLGiYlzCTopn["8. Picker Leaderboard"]
  wf2CKNtQUpZ5Rm80Z["9. OpenRouter Balance"]
  wfZB3SuyzKNXurQyI["svc.record_issue"]
  wgfR9qKH6xCTJXzcg["svc.auto_resolve_incidents"]
  wjWFGMw2faC2zLseh["svc.apply_card_changes"]
  wmOCorio8pJ9qlB8q["svc.record_diagnosis"]
  wmxXosIjmMSiItiYM["1. Set Active UFC Event (Sunday nights)"]
  wneIv7kEoopd67GLj["svc.list_incidents_to_diagnose"]
  woC1PuXuYb1pdeO0J["svc.health_sweep"]
  wpHQCLT93NxqScBgQ["svc.read_execution"]
  wy20ZZYzBVS6y8kC0["2. Extract Picker Video Transcripts"]
  wya1uS9XFsrlhq6e3["svc.sync_bout_ids"]
  wBvLnPFMwQ2vhPkgv -->|wait| wGQs7zaGeF1vZBRaj
  wBvLnPFMwQ2vhPkgv -->|wait| wLuALxCWYzByUY2Iq
  wBvLnPFMwQ2vhPkgv -->|wait| wya1uS9XFsrlhq6e3
  wBvLnPFMwQ2vhPkgv -->|wait| wUDRrGRyeFPL9Lk3S
  wBvLnPFMwQ2vhPkgv -->|wait| wjWFGMw2faC2zLseh
  wJcNXgWql9K4RrHm9 -->|wait| wy20ZZYzBVS6y8kC0
  wJcNXgWql9K4RrHm9 -->|wait| wBvLnPFMwQ2vhPkgv
  wLuALxCWYzByUY2Iq -->|wait| wSBBK0hOGx2uPYpm4
  wMabSJBF0Vt6sMICp -->|wait| wVkgPostfkMxFPWj6
  wMabSJBF0Vt6sMICp -->|dispatch| wy20ZZYzBVS6y8kC0
  wMabSJBF0Vt6sMICp -->|dispatch| wBvLnPFMwQ2vhPkgv
  wMabSJBF0Vt6sMICp -->|dispatch| wPulwhLsIZhfvCGxl
  wMabSJBF0Vt6sMICp -->|wait| wYeYpgLGiYlzCTopn
  wMabSJBF0Vt6sMICp -->|wait| wf2CKNtQUpZ5Rm80Z
  wMabSJBF0Vt6sMICp -->|wait| wG1EMMFVSzpGE4q3Q
  wMabSJBF0Vt6sMICp -->|wait| wXN5zvwsajUldmPgN
  wMabSJBF0Vt6sMICp -->|wait| wfZB3SuyzKNXurQyI
  wMabSJBF0Vt6sMICp -->|wait| wSkWzi2pqLtbW4HNN
  wMabSJBF0Vt6sMICp -->|wait| wJcNXgWql9K4RrHm9
  wMabSJBF0Vt6sMICp -->|wait| wIodUUBrjWAVd0cHi
  wUB711gFJFn9OuZwb -->|wait| wneIv7kEoopd67GLj
  wUB711gFJFn9OuZwb -->|wait| wmOCorio8pJ9qlB8q
  wUB711gFJFn9OuZwb -->|tool| wpHQCLT93NxqScBgQ
  wmxXosIjmMSiItiYM -->|wait| wLuALxCWYzByUY2Iq
  woC1PuXuYb1pdeO0J -->|dispatch| wUB711gFJFn9OuZwb
  wy20ZZYzBVS6y8kC0 -->|wait| wLuALxCWYzByUY2Iq
  wG1EMMFVSzpGE4q3Q -.->|dynamic| wy20ZZYzBVS6y8kC0
  wG1EMMFVSzpGE4q3Q -.->|dynamic| wBvLnPFMwQ2vhPkgv
  wSrL8ScYMIBiJ9Gki -.->|retry| wy20ZZYzBVS6y8kC0
  wSrL8ScYMIBiJ9Gki -.->|retry| wBvLnPFMwQ2vhPkgv
  wSrL8ScYMIBiJ9Gki -.->|retry| wPulwhLsIZhfvCGxl
```
