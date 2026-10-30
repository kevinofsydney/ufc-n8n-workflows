const p=$('Build Issue List').first().json;
return [{json:{sent:true,open_count:p.open_count,resolved_recent:p.resolved_recent}}];
