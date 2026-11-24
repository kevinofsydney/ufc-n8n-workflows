# Migration from n8n Cloud to the homelab

Handover for any agent continuing this work. Last updated 24 November 2026.

## Why and when

- The cloud instance is on the Starter plan: **2,500 production executions a month**. November used 2,751, and executions have been blocked since **07:47 UTC on 21 November**. The quota resets on **1 December**.
- The schedules alone fire about **130 times a day (around 3,900 a month)**. The two 30-minute jobs, `svc.health_sweep` and `svc.auto_resolve_incidents`, account for about 2,900 of those. December's quota will run out around mid-month unless that changes.
- The blocked window had these effects:
  - UFC Doha (21 November) was not graded.
  - `1. Set Active UFC Event` did not run on Sunday 23 November, so UFC Riyadh (5 December) has no spreadsheet and no captured videos.
  - After the reset, the next scheduled runs should catch up. Check this on 1 December.
- The cloud instance runs **n8n 2.49.5 on the beta track**.
- **Decision (owner, 24 November):** move to a dedicated homelab VM rather than upgrade the plan. Target cutover is the week after UFC Riyadh: after the December reset, and before December's quota runs out.

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
- Tailscale login, so the tailnet name can go into `.env`.
- The Telegram user ID and a test bot token.
- An NFS export for the backup share. This is why `qnap_backup_mount` was skipped in the first run.

## Workflow changes needed for self-hosting

Make these in this repository and on the homelab instance only. The cloud workflows stay as they are until cutover.

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
| Cutover | Agent, owner confirms timing | In a week with no event: unpublish cloud schedules and router, re-copy changed rows, switch the relay to the production bot token, publish in dependency order, and watch the first full cycle. |
| Rollback | Agent | Until the cloud account is cancelled: unpublish the homelab workflows, stop the relay, and republish the cloud router and schedules. The cloud Telegram Trigger re-registers its webhook when published. |

## Before cutover: stretch the cloud quota

From 1 December, running `svc.health_sweep` and `svc.auto_resolve_incidents` hourly instead of every 30 minutes would save about 1,450 executions a month. That keeps the cloud running until cutover. Revert after cutover only if needed; the homelab has no execution cap.

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
