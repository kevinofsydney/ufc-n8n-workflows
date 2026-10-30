const QUIET_HOURS=12;
const rows=$('Read All Incidents').all().map(function(item){return item.json;}).filter(function(row){return row && row.incident_key;});
const cutoff=Date.now()-QUIET_HOURS*60*60*1000;
const stale=rows.filter(function(row){
 if(row.status==='resolved')return false;
 if(row.source==='owner')return false;
 if(String(row.incident_key).indexOf('test|')===0)return false;
 const seen=Date.parse(row.last_seen_at||row.first_seen_at||'');
 return Number.isFinite(seen) && seen<cutoff;
});
if(!stale.length)return [];
const now=new Date().toISOString();
return stale.map(function(row){
 return {json:{incident_key:row.incident_key,incident_id:row.id,workflow_name:row.workflow_name||row.node_name||row.source||'pipeline',last_message:row.last_message||'',resolved_at:now,resolution:'Auto-closed: no recurrence in '+QUIET_HOURS+' hours.'}};
});
