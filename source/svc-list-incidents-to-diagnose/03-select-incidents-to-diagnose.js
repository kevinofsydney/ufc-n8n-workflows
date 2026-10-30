// Picks incidents that need a diagnosis and claims them, so the n8n Agent and the workflow diagnoser
// never work on the same one. Needs a diagnosis: open, alerted at least once, not a temporary error
// still being retried, and not diagnosed since it (re)opened. A claim older than an hour is stale.
const MAX_ATTEMPTS=2,CLAIM_MINUTES=60,LIMIT=3;
const req=$('When Called').first().json;
const claimer=String(req.claimer||'').trim();
if(!['agent','workflow','manual'].includes(claimer))throw new Error('claimer must be agent, workflow or manual.');
const olderThan=Number(req.older_than_minutes||0);
const onlyKey=String(req.incident_key||'').trim();
const now=Date.now(),nowIso=new Date(now).toISOString();
const minutes=t=>t?(now-Date.parse(t))/60000:Infinity;
const rows=$('Read Incidents').all().map(i=>i.json).filter(r=>r&&r.incident_key);
const candidates=rows.filter(r=>{
 if(onlyKey)return r.incident_key===onlyKey;
 if(r.incident_key.startsWith('test|'))return false;
 if(r.status!=='open'||!r.last_alerted_at)return false;
 if(minutes(r.last_alerted_at)<olderThan)return false;
 if(Number(r.diagnosis_attempts||0)>=MAX_ATTEMPTS&&!(r.diagnosed_at&&Date.parse(r.diagnosed_at)<Date.parse(r.first_seen_at)))return false;
 if(r.diagnosis_status==='in_progress'&&minutes(r.diagnosed_at)<CLAIM_MINUTES)return false;
 if(r.diagnosis_status==='done'&&r.diagnosed_at&&Date.parse(r.diagnosed_at)>=Date.parse(r.first_seen_at))return false;
 return true;
}).sort((a,b)=>Date.parse(b.last_alerted_at||0)-Date.parse(a.last_alerted_at||0)).slice(0,LIMIT);
// A reopened incident starts a fresh attempt count.
const claims=candidates.map(r=>({incident_key:r.incident_key,diagnosis_status:'in_progress',diagnosis_by:claimer,diagnosed_at:nowIso,
 diagnosis_attempts:(r.diagnosed_at&&Date.parse(r.diagnosed_at)<Date.parse(r.first_seen_at)?0:Number(r.diagnosis_attempts||0))+1}));
const incidents=candidates.map(r=>({incident_key:r.incident_key,source:r.source,workflow_id:r.workflow_id,workflow_name:r.workflow_name,node_name:r.node_name,
 category:r.category,message:r.last_message,occurrences:r.occurrences,first_seen_at:r.first_seen_at,last_seen_at:r.last_seen_at,
 last_execution_id:r.last_execution_id,last_execution_url:r.last_execution_url,retry_count:r.retry_count,previous_diagnosis:r.diagnosis_summary||null}));
return [{json:{count:incidents.length,incidents,claims,dry_run:req.dry_run===true}}];
