# Migration from n8n Cloud to the homelab

Handover for any agent continuing this work. Last updated 24 November 2026. Since the first version, the VM has joined the tailnet with `tailscale serve` running, and the owner's Telegram ID is in `.env`.

## Why and when

- The cloud instance is on the Starter plan: **2,500 production executions a month**. November used 2,751, and executions have been blocked since **07:47 UTC on 21 November**. The quota resets on **1 December**.
- The schedules alone fire about **130 times a day (around 3,900 a month)**. The two 30-minute jobs, `svc.health_sweep` and `svc.auto_resolve_incidents`, account for about 2,900 of those. December's quota will run out around mid-month unless that changes.
- The blocked window had these effects:
  - UFC Doha (21 November) was not graded.
  - `1. Set Active UFC Event` did not run on Sunday 23 November, so UFC Riyadh (5 December) has no spreadsheet and no captured videos.
  - After the reset, the next scheduled runs should catch up. Check this on 1 December.
- The cloud instance runs **n8n 2.49.5 on the beta track**.
- **Decision (owner, 24 November):** move to a dedicated homelab VM rather than upgrade the plan. Run both instances **in parallel** and decommission the cloud one as late as possible: when its quota runs out, or before the plan ends on 20 January, whichever comes first. See [Parallel run](#parallel-run).

## Target

The infrastructure plan, security design and runbook are in the homelab repository: [kevinofsydney/homelab `compose/n8n/README.md`](https://github.com/kevinofsydney/homelab/blob/main/compose/n8n/README.md). In short:

- **VM:** VM 140, with 2 vCPU, 3 GiB RAM and 40 GiB disk. It autostarts and is in the 3-day Proxmox backup job.
- **Firewall:** the Proxmox firewall allows public egress only, with DNS to the router, NFS to the NAS, and SSH in from the operator device.
- **Access:** no public ingress. The editor, API and MCP are tailnet-only, through `tailscale serve`.
- **Telegram:** a long-polling relay container forwards owner updates to a local Webhook node, authenticated with a header secret.
- **Image:** n8n stable 2.48.8. Before importing production workflows, move to the first stable 2.49.x or later, so nothing authored on the 2.49 beta is missing node versions.

### State on 24 November

Done:
- VM created, firewall installed and verified from inside the guest. Private ranges and IPv6 are blocked; Telegram, Google and NAS NFS are reachable.
- The staging playbook applied cleanly (`ok=36 changed=16 failed=0`).
- Docker is running, and the pinned image was pulled and checked: runs as UID 1000, Node `fetch` available, `n8n --version` 2.48.8.
- `.env` (root, 0600) was created with a generated webhook path. The relay secret file was generated on the VM. Neither value has left the VM.

Waiting on the owner:
- A second bot's token (the owner places it on the VM).
- The second Supadata account and, ideally, a separate OpenRouter key.
- An NFS export for the backup share. This is why `qnap_backup_mount` was skipped in the first run.

## Workflow changes needed for self-hosting

Make these in this repository and on the homelab instance only. The cloud workflows stay as they are; the cloud keeps running in parallel until it is decommissioned.

1. **`5. Telegram Command Router`:** replace the Telegram Trigger with a Webhook node:
   - POST, path set to `RELAY_WEBHOOK_PATH` from the VM's `.env`
   - Header Auth credential checking `x-relay-secret` against the relay secret file
   - respond immediately

   Follow it with a Set or Code node that outputs `$json.body`, so every downstream expression that reads `message` and `callback_query` keeps working. The relay already drops senders outside the allowlist; keep the router's own owner check anyway.
2. **`2. Extract Picker Video Transcripts`:** replace the one `n8n-nodes-supadata` node with an HTTP Request node (header-auth credential) calling the same Supadata endpoint. Community packages stay disabled on the homelab.
3. **Workflows that call the instance itself:**
   - `svc.read_execution` and `svc.diagnose_incident` use the n8n public API (Bearer credential) and the instance MCP server URL. Point them at `http://localhost:5678` and create a new API key on the homelab.
   - Execution links built in `2. Extract…` and `3. Analyse…` should use the homelab editor address. Store it in one place, such as a Set node or a data-table setting, not scattered string literals.
4. **Error workflow:** after import, set `settings.errorWorkflow` on every caller to the new ID of `svc.alert_failure`.
5. **Heartbeat:** add a final HTTP request to `svc.health_sweep` that pings an external heartbeat URL. Store the URL as a credential.
6. **Timezone:** schedules without their own timezone follow the instance default. Confirm the cloud default in its settings and set `N8N_TIMEZONE` to match before publishing.

## Migration procedure

| Step | Who | Notes |
| --- | --- | --- |
| Export workflows | Agent | Use MCP `get_workflow_details` for all 29 `UFC \|` workflows into `.private/` (Git-ignored). Also download the cloud dashboard backup as a second copy; it holds 78 workflows including archived ones. |
| Export data | Agent | Copy all rows of the 10 UFC data tables through MCP. The 27 `RA \|` tables belong to an archived project: ask the owner before moving them. `RA \| secrets` contains secrets and should not be copied blindly. |
| Owner setup | Owner | Create the owner account and turn on two-step login. Save the encryption key to a password manager. Create the API key and enable MCP. |
| Credentials | Owner | Recreate only those in use: Telegram (test bot first), Google Sheets and Google Drive (own OAuth client, In production), OpenRouter, Supadata (as header auth), YouTube API key (query auth), Exa header auth, n8n Bearer (new homelab key), and the relay Header Auth. The agent never types secrets. |
| Data tables | Agent | Create the 10 tables from `inventory/data-tables.json` and load the rows. Record the new table IDs. |
| Import | Agent | Import unpublished. Rewrite workflow IDs, data-table IDs, credential IDs, `errorWorkflow`, Execute Workflow targets and IDs inside Code nodes (see [dependencies](dependencies.md)). Apply the changes listed above. Validate every workflow. |
| Agent | Agent | Recreate the first-class Agent "UFC Incident Diagnostician" if the homelab version supports Agents. Otherwise keep diagnosis in the workflow AI Agent node. |
| Test | Agent and owner | Use the test bot. Run the order in [operations](operations.md#restore-or-clone): spreadsheet and card services, capture and analysis, views and grading, then diagnostics. |
| Go live in parallel | Agent | Publish on the homelab in dependency order with the second bot, separate Drive folder and own API accounts (see [Parallel run](#parallel-run)). Watch the first full cycle. |
| Rollback | Agent | While both run, rollback just means unpublishing the homelab workflows. After decommissioning, and until the plan ends: stop the relay and republish the cloud router and schedules. The cloud Telegram Trigger re-registers its webhook when published. |

## Parallel run

The owner chose a parallel run over a cutover. The two instances must not share anything that both write to:

| Resource | Cloud (current) | Homelab (parallel) |
| --- | --- | --- |
| Telegram | Production bot, webhook | Second bot, through the relay (one bot cannot use a webhook and polling at once). The owner mutes whichever chat is noisier. |
| Event spreadsheets | Existing Drive folder and template | **Separate Drive folder** with its own copy of the template. Point `svc.ensure_event_spreadsheet` at it. |
| Data tables | Cloud copies | Homelab copies, seeded from the cloud. Expect them to drift: grades, incidents and video state are kept per instance. |
| Supadata | Current account | **Second account** (owner provides). |
| OpenRouter | Current key | **A separate key is recommended.** The current key has a monthly limit with about $8.70 left (20 November), and a shared key would hide which instance spent it. |
| YouTube Data API | Same key is fine | Same key. |

### Cost of running twice

- **OpenRouter:** extraction costs about **1.4¢ per video**, measured on two Doha videos on 19 November (`openai/gpt-6-luna-pro`, about 60k input and 18k output tokens). At about 17 videos a card that is roughly **$0.25 a card**. The consensus explanation costs about $0.004 a card. A parallel run adds about $1 a month.
- **YouTube Data API:** every call is a 1-unit method (`channels.list`, `playlistItems.list`, `videos.list`); nothing uses the 100-unit `search.list`. One capture run costs about 15–30 units, giving about 50–100 units a day against the default 10,000-unit daily quota, so roughly 1%. Running twice is still about 1–2%. This is estimated from the workflow calls; Google Cloud's quota page has the exact figure.
- **Supadata:** one transcript per video per instance, covered by the second account.

### Decommissioning the cloud instance

Once the homelab has handled at least one full card and the owner is satisfied:
1. Unpublish the cloud schedules and router.
2. Point the production bot at the homelab relay by putting its token in the relay secret and restarting the relay. The relay clears the cloud webhook on start.
3. Point the homelab back at the production Drive folder if you want one sheet history, or keep the new folder.
4. Keep the cloud account untouched until the plan ends, as a fallback.

## Before decommissioning: stretch the cloud quota

From 1 December, running `svc.health_sweep` and `svc.auto_resolve_incidents` hourly instead of every 30 minutes would save about 1,450 executions a month. That keeps the cloud running alongside the homelab for most or all of December. The homelab has no execution cap, so its schedules can stay at 30 minutes.

## Follow-on: Fight Analyser expert picks

Planned after the move; nothing is built yet.

1. A new workflow, `svc.export_expert_picks`, writes structured picks to a private GitHub repository: pick, bout, fighters, confidence, channel, video link and grade. It contains no reasoning or transcript text.
2. The Fight Analyser daily refresh reads that file and matches each pick to a bout by fighter names and date.
3. Fight Analyser then:
   - shows the picks
   - rates each channel on earlier cards only
   - tests a "model + experts" layer in log-odds space, in the style of Silver's Deluxe forecast
4. The layer ships only if it beats the model out of sample by more than chance. History starts in July 2026: 19 graded cards and 1,792 graded picks.

This works the same from cloud or the homelab, because it needs only outbound access to GitHub.
