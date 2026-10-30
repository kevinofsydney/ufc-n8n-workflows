# Telegram operating guide

Use your configured Telegram bot; its account link is replaced with a placeholder in this repository. The router and sensitive services restrict requests to the configured owner chat. Inline buttons use the same normalized command routes as typed commands. `/menu` and unrecognized commands return the menu.

| Command | What happens | Completion and cost behavior |
| --- | --- | --- |
| `/capture` | Scan tracked channels and capture eligible new transcripts | Immediate acknowledgement; worker sends a final summary, including nothing-new or incomplete-scan results. Uses YouTube metadata quota and Supadata. |
| `/analyse` | Process saved captured transcripts needing analysis | Immediate acknowledgement; worker finishes separately. Uses OpenRouter credits. |
| `/addvideo https://www.youtube.com/watch?v=VIDEO_ID` | Validate, reserve, capture and analyse one public video for the active event | Service waits for targeted workers and reports final state. Duplicate/invalid requests do not dispatch analysis. |
| `/videos` or `/videos 2` | Browse captured active-event videos, eight per page | Reads saved metadata; no extraction/model call. Buttons reopen each video. |
| `/video VIDEO_ID` | Reopen saved picks and prop reasoning | Saved summary, with pagination, return-to-list, watch and spreadsheet links. |
| `/status` | Show event, capture/analysis progress, card state and run outcomes | Snapshot of stored state. Use execution links to investigate ambiguous results. |
| `/consensus` | Confidence-weighted consensus and cached explanation | A changed/missing explanation cache can call OpenRouter. |
| `/consensus plain` | Equal-vote consensus | Removes confidence/record vote weighting; consult cache/LLM branch for explanation calls. |
| `/grade` or `/grade event text` | Grade a finished event against ESPN | Immediate acknowledgement; grading worker completes separately. Explicit text selects a matching finished event. |
| `/leaderboard` | All-time performance from saved grades | No live grading or model extraction. |
| `/retry VIDEO_ID` | Automatically choose capture or analysis for one unfinished video | A queued reply, then worker completion separately. Five-minute request gap. |
| `/retry capture VIDEO_ID` | Retry the transcript stage | Refuses an already captured transcript. |
| `/retry analyse VIDEO_ID` | Retry unfinished analysis | Refuses completed analysis and recent PROCESSING work; uses OpenRouter. |
| `/credits` | Show available OpenRouter account/key credit information | Labels the available balance source. |
| `/issues` | List open issues and those resolved in the last seven days | Read-only view of the incident ledger. |
| `/issue Something looks wrong` | Record an owner issue for later work | Creates or increments an owner-sourced incident. It is protected from quiet-error auto-resolution. |
| `/fixed ID explanation` | Resolve an incident with an owner note | Records resolution; does not apply or verify a code fix. Use the ID/key from the issue list. |

## Finding a particular video's summary

Open **Videos**, navigate to the page containing its title, then tap the video button. The service reads that video's saved Picks and Props. Pending or failed analysis is shown explicitly rather than silently launching another model call. Older callbacks remain scoped to the active event; stale IDs offer a refresh rather than showing another event's data.

The internal `/video VIDEO_ID summaryPage listPage` form preserves navigation across long summaries. Normally use the buttons instead of typing page arguments.

## Understanding capture messages

“Capture started” is sent by the router before the asynchronous worker finishes. The final worker reply distinguishes captured transcripts, waiting transcript retries, exhausted transcript attempts, no new eligible videos, and incomplete channel checks. “No new eligible videos” means no work passed the current title/event/date/duplicate/retry filters; it does not mean the channel has never published a video.

Capture and Analyse are separate menu actions. Use `/analyse` after a manual capture if you want extraction immediately rather than waiting for the analysis schedule. `/addvideo` already chains both stages for its one target.

## Retry versus resubmission

Use `/addvideo` for a new public video. Use `/retry` for an existing unfinished video. Retry does not reset history and does not deliberately rerun completed analyses. If a fight card changed, the card-maintenance services can mark videos `CARD_CHANGED` for the next analysis pass; that is a different mechanism from owner retries.
