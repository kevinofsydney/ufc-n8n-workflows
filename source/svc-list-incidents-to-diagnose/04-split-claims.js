const c=$('Select Incidents To Diagnose').first().json.claims;
return c.length?c.map(x=>({json:x})):[{json:{incident_key:null}}];
