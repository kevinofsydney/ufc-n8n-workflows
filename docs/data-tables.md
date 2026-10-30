# Data table schema reference

Schema only; no live table rows are included. n8n additionally supplies system row fields such as id, createdAt and updatedAt. Table IDs are instance-specific and are not credentials.

## ufc_consensus_cache

ID: `0bCqy4NhtJzGAULv`.

| Column | Type |
| --- | --- |
| event_key | string |
| input_hash | string |
| explanations_json | string |
| model | string |
| cost_usd | number |
| created_at | date |

## ufc_events

ID: `WTTpdZSDVOxOB3Ex`.

| Column | Type |
| --- | --- |
| event_key | string |
| source_event_id | string |
| event_name | string |
| event_datetime_local | date |
| active | boolean |
| spreadsheet_id | string |
| spreadsheet_url | string |
| created_at | date |
| closed_at | date |
| notes | string |
| graded_at | date |

## ufc_fight_card_state

ID: `oCOZ7hzgZ2htYL9F`.

| Column | Type |
| --- | --- |
| event_key | string |
| spreadsheet_id | string |
| status | string |
| source_url | string |
| espn_event_id | string |
| source_fingerprint | string |
| card_fingerprint | string |
| source_card_json | string |
| initialized_at | date |
| checked_at | date |
| message | string |
| parser_version | string |
| change_status | string |
| change_checked_at | date |
| pending_change_json | string |
| pending_change_fingerprint | string |
| pending_seen_count | number |
| pending_first_seen_at | date |
| official_card_json | string |

## ufc_fight_results

ID: `N1yxE7DS3wzwTwK6`.

| Column | Type |
| --- | --- |
| event_key | string |
| espn_event_id | string |
| espn_competition_id | string |
| fighter_a | string |
| fighter_b | string |
| winner | string |
| method | string |
| method_detail | string |
| round | number |
| clock | string |
| elapsed_rounds | number |
| elapsed_minutes | number |
| scheduled_rounds | number |
| weight_class | string |
| recorded_at | date |

## ufc_incidents

ID: `bPLtuvVfcVLTLv2h`.

| Column | Type |
| --- | --- |
| incident_key | string |
| source | string |
| workflow_id | string |
| workflow_name | string |
| node_name | string |
| category | string |
| signature | string |
| last_message | string |
| status | string |
| occurrences | number |
| first_seen_at | date |
| last_seen_at | date |
| last_execution_id | string |
| last_execution_url | string |
| retry_count | number |
| last_retry_at | date |
| last_alerted_at | date |
| resolved_at | date |
| resolution | string |
| diagnosis_status | string |
| diagnosis_by | string |
| diagnosed_at | date |
| diagnosis_attempts | number |
| diagnosis_summary | string |
| diagnosis_json | string |
| severity | string |
| owner_note | string |
| resolved_by | string |
| fixed_in_version | string |

## ufc_monitor_state

ID: `j1D3nXVJHbVZvnUh`.

| Column | Type |
| --- | --- |
| monitor_key | string |
| threshold_usd | number |
| last_checked_at | date |
| last_alerted_at | date |
| remaining_usd | number |
| balance_source | string |
| status | string |

## ufc_pick_grades

ID: `r3YKyjLCAU8EiANs`.

| Column | Type |
| --- | --- |
| pick_id | string |
| event_key | string |
| channel_name | string |
| video_id | string |
| fight_order | number |
| fighter_a | string |
| fighter_b | string |
| picked_fighter | string |
| confidence_score | number |
| result | string |
| winner | string |
| graded_at | date |

## ufc_pipeline_runs

ID: `Tb9mpsswwq6uJvr6`.

| Column | Type |
| --- | --- |
| run_key | string |
| workflow_id | string |
| workflow_name | string |
| event_key | string |
| state | string |
| started_at | date |
| finished_at | date |
| summary | string |
| execution_url | string |

## ufc_prop_grades

ID: `1qPnxl4is7YBJW0X`.

| Column | Type |
| --- | --- |
| prop_id | string |
| event_key | string |
| channel_name | string |
| video_id | string |
| fight_order | number |
| market | string |
| selection | string |
| recommendation_strength | string |
| result | string |
| graded_at | date |

## ufc_videos

ID: `cAQonN6NYOY3fqxl`.

| Column | Type |
| --- | --- |
| video_id | string |
| channel_name | string |
| video_title | string |
| published_at | date |
| event_key | string |
| status | string |
| attempt_count | number |
| last_attempt_at | date |
| last_http_status | number |
| last_error | string |
| placeholder_appended | boolean |
| transcript_appended | boolean |
| transcript_parts | number |
| completed_at | date |
| analysis_status | string |
| analysis_attempt_count | number |
| analysis_model | string |
| analysis_prompt_version | string |
| analysed_at | date |
| analysis_error | string |
| analysis_profile | string |
| event_match_status | string |
| event_match_reason | string |
| matched_event_key | string |
| event_match_version | string |
| retry_requested_at | date |
| retry_stage | string |
| analysis_execution_id | string |
