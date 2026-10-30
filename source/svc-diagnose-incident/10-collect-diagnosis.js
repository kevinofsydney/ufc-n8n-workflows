// Pairs each diagnosis with its incident; a failed or empty AI run is skipped and its claim expires after an hour.
const incidents=$('One Item Per Incident').all().map(i=>i.json);
return $input.all().map((item,i)=>{const o=item.json.output;if(!o||typeof o!=='object'||!o.summary||!o.root_cause)return null;return {json:{...o,incident_key:incidents[i].incident_key,dry_run:incidents[i].dry_run===true}};}).filter(Boolean);
