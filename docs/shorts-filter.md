# Shorts exclusion policy

Channel-discovery results use canonical watch URLs, so a `/shorts/` URL check alone does not identify Shorts. Public YouTube Data API metadata exposes duration but has no reliable public `isShort` flag. The pipeline therefore enforces a conservative long-form-only rule.

- Fetch `videos.list(part=contentDetails)` for candidate IDs in batches of at most 50.
- Reject durations of **181 seconds or less**: the three-minute Shorts ceiling plus one second of tolerance for API/transcoding duration differences.
- Also reject explicit `/shorts/` URLs and `Shorts`/`#short` title markers, even if metadata is inconsistent.
- Missing, zero, malformed or unavailable duration metadata blocks worker processing rather than allowing unverified videos through.
- This deliberately also excludes short landscape clips; it does not claim that every rejected video is technically categorized as a Short by YouTube.

The shared capture guard covers scheduled scans, on-demand capture, submitted-video capture and targeted capture retries. Analysis has the same guard before transcript joining/model calls, including existing captured records and targeted analysis retries. `/addvideo` checks duration before reserving a new row and gives an explicit rejection reply for short clips or unverified metadata.

Capture summaries report short-clip exclusions when work reaches the guard. A scan containing no new selected candidates does not perform redundant duration checks on every already-recorded video. Existing saved rows are not deleted or voided by this filter; previously completed Short-derived data can still appear in saved views/aggregations until separately cleaned up.

## Verified examples and tests

Live read-only execution 2796 requested metadata for the reported JakeGerberMMA clip `iyeMtl78dZs` and the full breakdown `lMMkQKwfuc0`. The API reported `PT46S` and `PT1H7M2S`, respectively. The filter rejected the clip and retained the 4,022-second breakdown, without invoking transcript capture, model analysis or spreadsheet/table writes. Temporary test nodes were removed before publication.

Full capture validation 2797 completed successfully with all 13 channels checked, no new work and no duplicates. Thirty-two fixture tests cover duration boundaries, one-second tolerance, explicit markers, reversed metadata ordering, missing/private/deleted videos, malformed/error responses, batches over 50, duplicate IDs, all-excluded completion reporting, and add-video rejection/dry-run/duplicate behavior.

Run `node --test shorts-filter/shorts.test.mjs`. These tests use synthetic context and public video IDs, never credentials or owner account identifiers.

References: [YouTube three-minute Shorts](https://support.google.com/youtube/answer/15424877?hl=en) and [video duration metadata](https://developers.google.com/youtube/data/reference/rest/v3/videos).
