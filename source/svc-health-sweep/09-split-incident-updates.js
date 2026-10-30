const u=$('Sweep Pipeline Health').first().json.updates;
return u.length?u.map(x=>({json:x})):[{json:{incident_key:null}}];
