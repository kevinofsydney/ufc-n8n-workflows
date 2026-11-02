# Shorts exclusion policy

Channel-discovery results use canonical watch URLs, so a `/shorts/` URL check alone does not identify Shorts. Public YouTube Data API metadata exposes duration but has no reliable public `isShort` flag. The pipeline therefore enforces a conservative long-form-only rule.

- Fetch `videos.list(part=contentDetails)` for candidate IDs in batches of at most 50. `maxResults` is not sent because YouTube does not support it with `id`.
- Reject durations of **181 seconds or less**: the three-minute Shorts ceiling plus one second of tolerance for API/transcoding duration differences.
- Also reject explicit `/shorts/` URLs and `Shorts`/`#short` title markers, even if metadata is inconsistent.
- A video with missing, zero (`P0D`, `PT0S`) or malformed duration, or absent from the API response, is set aside and never processed. Valid videos in the same run continue.
- A bad YouTube response as a whole (`error` present, no `items` array, or a batch with no response) throws and fails the run, because it says nothing about individual videos.
- This deliberately also excludes short landscape clips; it does not claim that every rejected video is technically categorized as a Short by YouTube.

The shared capture guard covers scheduled scans, on-demand capture, submitted-video capture and targeted capture retries. Analysis has the same guard before transcript joining/model calls, including existing captured records and targeted analysis retries. `/addvideo` checks duration before reserving a new row and gives an explicit rejection reply for short clips or unverified metadata.

Capture summaries report short-clip exclusions and unverified videos separately when work reaches the guard. A scan containing no new selected candidates does not perform redundant duration checks on every already-recorded video. Existing saved rows are not deleted or voided by this filter; previously completed Short-derived data can still appear in saved views/aggregations until separately cleaned up.

## Unverified videos

Published on 2 November 2026. Production capture 3574 and analysis 3577 ran successfully after publishing, but neither had new work, so per-video skipping has only been exercised by fixtures so far.

The guard adds `shorts_unverified_count`, `shorts_unverified` (ID, title, channel, reason) and `shorts_unverified_note` to its output. The reason is `no_usable_duration` or `absent_from_api_response`. If nothing remains, it returns the usual no-work result with `capture_run_state: idle`.

| Where | What reports it |
| --- | --- |
| Capture, work found | Telegram section in `Build Telegram Summary`, and the `Record Capture Result` run summary |
| Capture, nothing left | Telegram section in `Build Capture Idle Summary`, and the `Record Capture Idle` run summary |
| Analysis, work found | `Record Analysis Result` run summary only |
| Analysis, nothing left | `Record Analysis Idle` run summary only |

Run summaries place the note early because `/status` shows only the first 130 characters. The note names at most three IDs.

Setting a video aside writes nothing to it, so it is rechecked on every run. A live stream or premiere is processed automatically once YouTube reports a real duration.

A saved video that has gone private behaves as follows in analysis:

- Each run reselects it while its row qualifies. A never-analysed, `CARD_CHANGED`, `FAILED` or `RETRY` row qualifies until the event stops being active. `FAILED` and `RETRY` rows must have attempts remaining.
- `Mark Analysis Processing` runs after the guard, so its status and `analysis_attempt_count` do not change and it never reaches the attempt limit. It costs no model credits and takes one YouTube quota unit per batch.
- `Max Analysis Videos` runs after the guard, so the video does not use up one of the five analysis slots.
- It is analysed normally if the video becomes public again.

An unverified video no longer fails the run, so it raises no error alert or incident, and the health sweep treats the `idle` or `success` run as healthy. Analysis has no run-level Telegram message. A targeted `/retry analyse` of an unverified video therefore replies "Retry queued" and then sends nothing further, leaving the row in `RETRY_REQUESTED`. Check `/status` for the outcome.

## Verified examples and tests

Live read-only execution 2796 requested metadata for the reported JakeGerberMMA clip `iyeMtl78dZs` and the full breakdown `lMMkQKwfuc0`. The API reported `PT46S` and `PT1H7M2S`, respectively. The filter rejected the clip and retained the 4,022-second breakdown, without invoking transcript capture, model analysis or spreadsheet/table writes. Temporary test nodes were removed before publication.

Full capture validation 2797 completed successfully with all 13 channels checked, no new work and no duplicates. Forty-six fixture tests cover duration boundaries, one-second tolerance, explicit markers, reversed metadata ordering, unverified videos set aside alongside valid ones, malformed/error/missing responses, batches over 50, duplicate IDs, all-excluded and all-unverified completion reporting, separate summary reporting, and add-video rejection/dry-run/duplicate behavior. Those two execution checks predate per-video set-aside, which has only been tested with fixtures.

Run `node --test shorts-filter/shorts.test.mjs`. These tests use synthetic context and public video IDs, never credentials or owner account identifiers.

References: [YouTube three-minute Shorts](https://support.google.com/youtube/answer/15424877?hl=en) and [video duration metadata](https://developers.google.com/youtube/data/reference/rest/v3/videos).
