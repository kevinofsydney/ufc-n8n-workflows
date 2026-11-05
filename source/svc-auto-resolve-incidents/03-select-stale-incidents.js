const QUIET_HOURS=12;
// A card incident closes only once a later card check succeeded, not on quiet time alone: on 4 Nov a quiet
// period hid that a card failure was only cleared by a later run. With no such check it closes after 72 hours.
const CARD_FALLBACK_HOURS=72;
const CARD_WORKFLOW=/svc\.(detect_card_changes|apply_card_changes|sync_bout_ids|populate_fight_card|ensure_event_spreadsheet)|Fight-Week Card Check/;
const rows=$('Read All Incidents').all().map(function(item){return item.json;}).filter(function(row){return row && row.incident_key;});
const ms=function(v){const t=Date.parse(v||'');return Number.isFinite(t)?t:0;};
// The latest time any event's card was checked or built successfully.
let cardOkAt=0;
$('Read Card State').all().forEach(function(item){
 const s=item.json||{};
 if(['IN_SYNC','APPLIED','PARTLY_APPLIED'].indexOf(s.change_status)>=0)cardOkAt=Math.max(cardOkAt,ms(s.change_checked_at));
 if(['READY','PRESERVED'].indexOf(s.status)>=0)cardOkAt=Math.max(cardOkAt,ms(s.checked_at));
});
const now=Date.now();
const hour=60*60*1000;
const closing=[];
rows.forEach(function(row){
 if(row.status==='resolved')return;
 if(row.source==='owner')return;
 if(String(row.incident_key).indexOf('test|')===0)return;
 const seen=ms(row.last_seen_at||row.first_seen_at);
 if(!seen||seen>=now-QUIET_HOURS*hour)return;
 let resolution='Auto-closed: no recurrence in '+QUIET_HOURS+' hours.';
 if(CARD_WORKFLOW.test(String(row.workflow_name||''))){
  if(cardOkAt>seen)resolution='Auto-closed: a later card check succeeded ('+new Date(cardOkAt).toISOString().slice(0,16)+'Z) and no recurrence in '+QUIET_HOURS+' hours.';
  else if(seen<now-CARD_FALLBACK_HOURS*hour)resolution='Auto-closed: no recurrence in '+CARD_FALLBACK_HOURS+' hours, but no later card check succeeded. Check the card.';
  else return;
 }
 closing.push({row:row,resolution:resolution});
});
if(!closing.length)return [];
const at=new Date(now).toISOString();
return closing.map(function(c){
 const row=c.row;
 return {json:{incident_key:row.incident_key,incident_id:row.id,workflow_name:row.workflow_name||row.node_name||row.source||'pipeline',last_message:row.last_message||'',resolved_at:at,resolution:c.resolution}};
});
