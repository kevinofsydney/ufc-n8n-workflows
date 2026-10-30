const p=$('Prepare Diagnosis').first().json;
return [{json:{recorded:true,incident_key:p.incident_key,telegram_sent:p.dry_run!==true,dry_run:p.dry_run}}];
