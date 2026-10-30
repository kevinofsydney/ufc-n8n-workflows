const rows=$('Read All Incidents').all().map(function(item){return item.json;}).filter(function(row){return row && row.incident_key;});
const esc=function(value){return String(value===undefined||value===null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
const nl=String.fromCharCode(10);
const clip=function(value,max){
 const text=String(value===undefined||value===null?'':value).replace(/\s+/g,' ').trim();
 if(text.length<=max)return text;
 const cut=text.slice(0,max);
 const lastSpace=cut.lastIndexOf(' ');
 return (lastSpace>max*0.6?cut.slice(0,lastSpace):cut).replace(/[\s,;:.\-]+$/,'')+'…';
};
const stamp=function(value){if(!value)return 'unknown';const time=new Date(value);return Number.isFinite(time.getTime())?time.toLocaleDateString('en-AU',{timeZone:'Australia/Sydney',day:'numeric',month:'short'}):'unknown';};
const open=rows.filter(function(row){return row.status!=='resolved';}).sort(function(a,b){return String(a.first_seen_at||'').localeCompare(String(b.first_seen_at||''));});
const cutoff=Date.now()-7*24*60*60*1000;
const resolved=rows.filter(function(row){return row.status==='resolved' && row.resolved_at && Date.parse(row.resolved_at)>=cutoff;}).sort(function(a,b){return String(b.resolved_at||'').localeCompare(String(a.resolved_at||''));});
const lines=['<b>UFC issues</b>'];
if(!open.length){
 lines.push('No open issues.');
}else{
 lines.push('Open: '+open.length);
 open.slice(0,10).forEach(function(row){
  const severity=row.severity?(' ['+esc(row.severity)+']'):'';
  const who=esc(row.workflow_name||row.node_name||row.source||'pipeline');
  lines.push('#'+row.id+severity+' '+who+' — '+esc(clip(row.owner_note||row.last_message||'(no detail)',110)));
  lines.push('   ×'+Number(row.occurrences||1)+', since '+stamp(row.first_seen_at)+(row.source==='owner'?' · reported by you':''));
 });
 if(open.length>10)lines.push('… '+(open.length-10)+' more open; check the ufc_incidents table.');
}
if(resolved.length){
 lines.push('','<b>Resolved in the last 7 days</b>');
 resolved.slice(0,5).forEach(function(row){
  const who=esc(row.workflow_name||row.source||'pipeline');
  const by=row.resolved_by?(' ('+esc(row.resolved_by)+')'):'';
  lines.push('#'+row.id+' '+who+' — '+esc(clip(row.resolution||'resolved',95))+by);
 });
}
lines.push('','<code>/fixed ID</code> closes one. <code>/issue TEXT</code> records one.');
let text=lines.join(nl);
if(text.length>3900)text=text.slice(0,3880)+'…';
return [{json:{text:text,open_count:open.length,resolved_recent:resolved.length,dry_run:$('When Called').first().json.dry_run===true}}];
