# Pre-publication privacy review

The publication candidate was reviewed before the first Git commit or push. The repository is private as an additional access control; sanitization does not depend on that visibility.

## Removed or replaced

- API-key/token/private-key patterns and literal authentication values were scanned. No such secrets were found in the publication candidate.
- Credential IDs/values are excluded. Credential display names use generic aliases based on integration type.
- Owner Telegram chat IDs are replaced with `0`, including embedded JavaScript guards, defaults and trigger filters. This is a disabled placeholder, not a functioning deployment configuration.
- The personal n8n instance hostname and bot-account link are replaced with generic placeholders.
- Private Google template, folder and spreadsheet identifiers are replaced with placeholders in both locators and notes/links.
- Personal email addresses are redacted. Owner names/usernames are checked against local evidence and excluded from file contents.
- Webhook IDs, pinned/static execution data, operational table rows, transcripts and actual spreadsheet contents are not exported.
- Ignored local MCP responses, previous feature/test directories and environment files are excluded from the Git tree.
- The first commit uses a neutral documentation author and a generic noreply email instead of the owner's personal Git author identity.

## Deliberately retained

Workflow/table/version IDs, node IDs and dependency references remain for traceability. They identify application resources and do not authenticate access. Credential types, external public API endpoints, configured timezone, public UFC/channel/video references and algorithm thresholds remain because they explain behavior. The GitHub repository itself is owned by the user's GitHub account; account attribution at the hosting layer cannot be anonymized by redacting repository files.

## Operational consequence

The snapshots and extracted code document the sanitized configuration. They must be rebound before use: replace the owner chat placeholder, instance URL, bot identity, generic credential bindings and private Google resource locators. Sanitization affects this repository only and does not change the running n8n instance.

## Repeatability

`scripts/sanitize.py` derives replacements from ignored local MCP inputs rather than committing a list of the owner's identifiers. `scripts/build-docs.py` applies the same replacement rules to regenerated exports and source. `scripts/verify-docs.py` checks secret formats, privacy identifiers, references, hashes, JavaScript syntax and local links. Pattern checks supplement a staged-content review; they are not a guarantee that every possible sensitive format is detectable.
