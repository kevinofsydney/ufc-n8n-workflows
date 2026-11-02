
// Validates a diagnosis, formats the Telegram message and builds the incident update. The message always
// goes to the owner's chat with fixed formatting; diagnosers only supply text, which is escaped here.
// A bad call never throws: it returns ok:false with a reason, so a diagnoser can correct itself in the
// same run instead of the error workflow turning the rejection into another incident.
const req=$('When Called').first().json;
const text=(v,max)=>String(v??'').trim().slice(0,max);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const key=text(req.incident_key,300);
const incident=$('Read Incident').all().map(i=>i.json).find(r=>r.incident_key&&r.incident_key===key);
const reject=reason=>[{json:{ok:false,incident_key:key,reason,retry_hint:'Call get_incidents_to_diagnose again to read the incident_key values, then call record_diagnosis with incident_key, summary and root_cause filled in.'}}];
if(!key)return reject('incident_key is required but was empty.');
if(!incident)return reject('No incident matches incident_key '+key+'.');
const by=text(req.diagnosed_by,40)||'unknown';
const confidence=['high','medium','low'].includes(text(req.confidence,10).toLowerCase())?text(req.confidence,10).toLowerCase():'low';
const d={summary:text(req.summary,400),root_cause:text(req.root_cause,1500),evidence:text(req.evidence,1500),affected:text(req.affected,600),
 proposed_fix:text(req.proposed_fix,1500),needs_human:req.needs_human===true||String(req.needs_human).toLowerCase()==='true',human_steps:text(req.human_steps,800),confidence};
if(!d.summary||!d.root_cause)return reject('A diagnosis needs both summary and root_cause.');
const lines=['<b>Incident diagnosis</b>'+(key.startsWith('test|')?' <i>(TEST)</i>':''),
 '<b>Workflow:</b> '+esc(incident.workflow_name||incident.node_name),
 '<b>Summary:</b> '+esc(d.summary),
 '<b>Root cause</b> ('+confidence+' confidence): '+esc(d.root_cause)];
if(d.evidence)lines.push('<b>Evidence:</b> '+esc(d.evidence));
if(d.affected)lines.push('<b>Affected:</b> '+esc(d.affected));
if(d.proposed_fix)lines.push('<b>Proposed fix:</b> '+esc(d.proposed_fix));
if(d.needs_human)lines.push('<b>Needs you:</b> '+esc(d.human_steps||'Yes; see the proposed fix.'));
lines.push('<i>Diagnosed by '+esc(by)+'. Read-only: nothing was changed.</i>');
let message=lines.join('\n');
if(message.length>3900)message=message.slice(0,3880)+'…';
return [{json:{ok:true,incident_key:key,update:{diagnosis_status:'done',diagnosis_by:by,diagnosed_at:new Date().toISOString(),diagnosis_summary:d.summary,diagnosis_json:JSON.stringify(d)},
 telegram_message:message,dry_run:req.dry_run===true}}];
