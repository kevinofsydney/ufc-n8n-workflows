const items=$('Select Stale Incidents').all().map(function(item){return item.json;});
const nl=String.fromCharCode(10);
const esc=function(value){return String(value===undefined||value===null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
const lines=['<b>Auto-closed '+items.length+' incident'+(items.length===1?'':'s')+'</b>','No recurrence in 12 hours.'];
items.slice(0,8).forEach(function(row){lines.push('#'+row.incident_id+' '+esc(row.workflow_name)+' — '+esc(row.last_message).slice(0,110));});
if(items.length>8)lines.push('… '+(items.length-8)+' more.');
return [{json:{count:items.length,text:lines.join(nl)}}];
