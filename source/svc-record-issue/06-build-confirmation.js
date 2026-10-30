const p=$('Prepare Issue').first().json;
return [{json:{telegram_message:p.telegram_message,dry_run:$('When Called').first().json.dry_run===true,action:p.action,incident_key:p.incident_key}}];
