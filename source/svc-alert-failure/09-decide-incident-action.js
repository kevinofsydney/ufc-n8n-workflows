// Decides, for one failure, whether to alert and whether to retry, and builds the incident row.
// Rules: temporary errors in retry-safe workflows are retried once (no alert); a failed retry alerts.
// Repeats of an open incident alert at most once a day; the same error in a second workflow within
// 15 minutes (a sub-workflow and its caller) alerts once. Resolved incidents alert again if they return.
const RETRY_SAFE={y20ZZYzBVS6y8kC0:'2. Extract Picker Video Transcripts',BvLnPFMwQ2vhPkgv:'3. Analyse Picker Video Transcripts',PulwhLsIZhfvCGxl:'7. Grade Picks'};
const SCHEDULE_ONLY={mxXosIjmMSiItiYM:true,MWmlPIyBDUKoheXO:true};
const c=$('Classify Failure').first().json;
const now=new Date(),nowIso=now.toISOString();
const hours=t=>t?(now-Date.parse(t))/3600e3:Infinity;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const sydney=t=>new Date(t).toLocaleString('en-AU',{timeZone:'Australia/Sydney',dateStyle:'medium',timeStyle:'short'});
const rows=$('Find Incidents').all().map(i=>i.json).filter(r=>r.incident_key);
const prev=rows.find(r=>r.incident_key===c.incident_key)||null;
const reopened=!!prev&&prev.status==='resolved';
const retryFailed=!!prev&&prev.status==='retrying'&&hours(prev.last_retry_at)<6;
const topLevel=c.mode!=='integrated';
const recentRetries=prev&&!reopened&&hours(prev.last_retry_at)<6?Number(prev.retry_count||0):0;
const retry=c.category==='transient'&&topLevel&&!!RETRY_SAFE[c.workflow_id]&&!retryFailed&&recentRetries<1;
const sibling=rows.find(r=>r.incident_key!==c.incident_key&&hours(r.last_alerted_at)<0.25);
const occurrences=(prev&&!reopened?Number(prev.occurrences||0):0)+1;
let alert,reason;
// A retried run is started by this workflow, so it counts as a sub-workflow run: check for it first.
if(retryFailed){alert=true;reason='failed again after an automatic retry';}
else if(retry){alert=false;reason='temporary error: retrying in 5 minutes';}
else if(c.category==='transient'&&!topLevel){alert=false;reason='temporary error in a sub-workflow: its caller handles it';}
else if(sibling){alert=false;reason='same error already alerted for '+sibling.workflow_name;}
else if(!prev||reopened){alert=true;reason=reopened?'back after being resolved':'new';}
else if(hours(prev.last_alerted_at)>=24){alert=true;reason='still failing';}
else{alert=false;reason='repeat within 24 hours';}
const firstSeen=prev&&!reopened?prev.first_seen_at:nowIso;
const extra=[];
if(retryFailed)extra.push('<b>Automatic retry:</b> tried once; it failed again.');
else if(reopened)extra.push('<b>Note:</b> this had been resolved; it is failing again.');
else if(reason==='still failing')extra.push('<b>Repeats:</b> '+occurrences+' times since '+esc(sydney(firstSeen))+' (Sydney).');
if(alert&&c.category==='transient'&&SCHEDULE_ONLY[c.workflow_id])extra.push('Temporary error: this workflow will run again at its next scheduled time.');
const row={incident_key:c.incident_key,source:'error',workflow_id:c.workflow_id,workflow_name:c.workflow_name,node_name:c.node_name,category:c.category,
 signature:c.signature,last_message:String(c.failure_summary||'').slice(0,1400),status:retry?'retrying':'open',occurrences,first_seen_at:firstSeen,last_seen_at:nowIso,
 last_execution_id:String(c.run_key),last_execution_url:c.execution_url||'',retry_count:retry?recentRetries+1:Number(prev?.retry_count||0),
 last_retry_at:retry?nowIso:(prev?.last_retry_at||null),last_alerted_at:alert?nowIso:(reason.startsWith('same error already alerted')?sibling.last_alerted_at:(prev?.last_alerted_at||null)),resolved_at:null,resolution:''};
return [{json:{...row,alert,alert_reason:reason,retry,retry_workflow_id:retry?c.workflow_id:'',telegram_text:[c.text,...extra].join('\n'),dry_run:c.is_test===true&&c.dry_run===true}}];
