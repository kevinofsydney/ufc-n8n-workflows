# Schedules

Times below are configured wall-clock values. An explicit workflow timezone wins; otherwise n8n uses the instance default, which was not supplied in the MCP workflow snapshots. Do not infer Sydney time from workflow names or owner location. Confirm the instance timezone before converting inherited schedules to local time. Weekday numbers: 0 Sunday, 1 Monday, …, 6 Saturday. Missing weekly days default to Sunday; missing minutes default to zero.

| Workflow | Trigger | Configured rule | Timezone |
| --- | --- | --- | --- |
| [UFC \| 1. Set Active UFC Event (Sunday nights)](workflows/1-set-active-ufc-event-sunday-nights.md) | Schedule Trigger | {"field": "weeks", "triggerAtHour": 18} | instance default |
| [UFC \| 2. Extract Picker Video Transcripts](workflows/2-extract-picker-video-transcripts.md) | Schedule Trigger | {"field": "weeks", "triggerAtDay": [1, 2, 3, 4, 5, 6], "triggerAtHour": 18} | instance default |
| [UFC \| 2. Extract Picker Video Transcripts](workflows/2-extract-picker-video-transcripts.md) | Schedule Trigger | {"field": "weeks", "triggerAtDay": [1, 2, 3, 4, 5, 6], "triggerAtHour": 6} | instance default |
| [UFC \| 3. Analyse Picker Video Transcripts](workflows/3-analyse-picker-video-transcripts.md) | Schedule Trigger | {"field": "weeks", "triggerAtDay": [2, 3, 4, 5, 6], "triggerAtHour": 6, "triggerAtMinute": 30} | instance default |
| [UFC \| 3. Analyse Picker Video Transcripts](workflows/3-analyse-picker-video-transcripts.md) | Schedule Trigger | {"field": "weeks", "triggerAtDay": [2, 3, 4, 5, 6, 1], "triggerAtHour": 18, "triggerAtMinute": 30} | instance default |
| [UFC \| 3. Analyse Picker Video Transcripts](workflows/3-analyse-picker-video-transcripts.md) | Schedule Trigger | {"field": "weeks", "triggerAtDay": [0, 3, 4, 5, 6, 2], "triggerAtHour": 12, "triggerAtMinute": 30} | instance default |
| [UFC \| 4. Add New UFC Events](workflows/4-add-new-ufc-events.md) | Schedule Trigger | {"field": "weeks", "triggerAtDay": [1, 4], "triggerAtHour": 12} | instance default |
| [UFC \| 6. UFC Consensus Picks (weighted)](workflows/6-ufc-consensus-picks-weighted.md) | Daily Digest Check | {"field": "days", "daysInterval": 1, "triggerAtHour": 18, "triggerAtMinute": 0} | Australia/Melbourne |
| [UFC \| 7. Grade Picks](workflows/7-grade-picks.md) | Every 2 Hours | {"field": "hours", "hoursInterval": 2} | instance default |
| [UFC \| 9. OpenRouter Balance](workflows/9-openrouter-balance.md) | Check Credit Morning and Evening | {"field": "cronExpression", "expression": "0 9,21 * * *"} | Australia/Sydney |
| [UFC \| svc.auto_resolve_incidents](workflows/svc-auto-resolve-incidents.md) | Every 30 Minutes | {"field": "minutes", "minutesInterval": 30} | instance default |
| [UFC \| svc.health_sweep](workflows/svc-health-sweep.md) | Every 30 Minutes | {"field": "minutes", "minutesInterval": 30} | Australia/Sydney |
