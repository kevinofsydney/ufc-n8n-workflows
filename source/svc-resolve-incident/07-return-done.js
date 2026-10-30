const p=$('Pick Incident').first().json;
return [{json:{ok:p.ok===true,incident:p.incident_key||'',already_resolved:p.already_resolved===true,telegram_sent:p.dry_run!==true,dry_run:p.dry_run}}];
