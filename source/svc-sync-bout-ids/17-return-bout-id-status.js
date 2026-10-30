const plan=$('Plan Bout IDs').first().json;
const status=plan.dry_run?'PREVIEW':plan.writes.length?'SYNCED':'UNCHANGED';
return [{json:{...plan.event,bout_id_sync:{status,...plan.summary,writes:plan.writes.map(w=>w.label)},fight_bout_ids:plan.bout_ids}}];
