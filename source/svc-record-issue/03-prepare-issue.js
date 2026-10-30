const req=$('When Called').first().json;
const clean=function(value,max){return String(value===undefined||value===null?'':value).trim().slice(0,max);};
const note=clean(req.note,900);
if(note.length<4)throw new Error('Describe the issue in a few words, for example: /issue Props tab missing bout_id column');
const normalise=function(text){return text.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();};
let hash=2166136261;
const seed=normalise(note);
for(let i=0;i<seed.length;i++){hash^=seed.charCodeAt(i);hash=Math.imul(hash,16777619)>>>0;}
const baseKey='owner|'+hash.toString(16);
const rows=$('Read All Incidents').all().map(function(item){return item.json;}).filter(function(row){return row && row.incident_key;});
const existing=rows.filter(function(row){return row.incident_key.indexOf(baseKey)===0;});
const open=existing.filter(function(row){return row.status!=='resolved';})[0];
const severityRaw=clean(req.severity,20).toLowerCase();
const severity=['blocking','degraded','cosmetic'].indexOf(severityRaw)>=0?severityRaw:'degraded';
const now=new Date().toISOString();
const nl=String.fromCharCode(10);
if(open){
 const count=Number(open.occurrences||1)+1;
 return [{json:{action:'update',incident_key:open.incident_key,incident_id:open.id,new_occurrences:count,severity:severity,note:note,now:now,telegram_message:'<b>Issue noted again</b> #'+open.id+nl+'Occurrences: '+count+nl+note.slice(0,300)}}];
}
const key=existing.length?baseKey+'-'+Date.now().toString(36):baseKey;
return [{json:{action:'insert',incident_key:key,new_occurrences:1,severity:severity,note:note,workflow_name:clean(req.workflow_name,200),workflow_id:clean(req.workflow_id,80),category:clean(req.category,80)||'owner-report',now:now,telegram_message:'<b>Issue recorded</b>'+nl+'Severity: '+severity+nl+note.slice(0,300)+nl+'<i>Close it with /fixed &lt;id&gt; once solved.</i>'}}];
