// Turns the change recorded by svc.detect_card_changes into an exact set of sheet writes.
// Rules: additions and detail changes apply at once; a removal (or the old half of an opponent change)
// waits until two checks in a row agree AND ESPN no longer lists the bout; more than 3 removals at once
// needs a human. Bouts still waiting stay on the card. Nothing here writes.
const HEADERS=['fight_order','fighter_a','fighter_b','fighter_a_aliases','fighter_b_aliases','bout_type','scheduled_rounds','weight_class'];
const TABS=[{sheet:'Picks',node:'Read Picks'},{sheet:'Props',node:'Read Props'},{sheet:'Fight Analysis',node:'Read Fight Analysis'}];
const VOID='VOID_CARD_CHANGE';
const MAX_REMOVALS=3;
const text=v=>String(v??'').trim();
const norm=v=>text(v).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const words=v=>' '+text(v).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()+' ';
const surname=v=>{const w=words(v).trim().split(' ').filter(x=>x&&!['jr','sr','ii','iii','iv'].includes(x));return w[w.length-1]||'';};
const label=b=>b.fighter_a+' vs '+b.fighter_b;
const colName=index=>{let n=index+1,s='';while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26);}return s;};
function fingerprint(rows){const value=JSON.stringify(rows.map(r=>r.map(v=>text(v))));let hash=2166136261;for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619)>>>0;return 'fnv1a-'+hash.toString(16).padStart(8,'0');}
function checkCard(rows){
 const seen=new Set();
 rows.forEach((r,i)=>{
  if(Number(r[0])!==i+1||!text(r[1])||!text(r[2])||norm(r[1])===norm(r[2]))throw new Error('New card has invalid order or fighters at fight '+(i+1)+'.');
  if(!['main_event','main_card','prelim'].includes(text(r[5]))||![3,5].includes(Number(r[6])))throw new Error('New card has missing bout type or scheduled rounds at fight '+(i+1)+'.');
  if((i===0)!==(r[5]==='main_event'))throw new Error('New card must have exactly one main event at fight 1.');
  if(!text(r[7]))throw new Error('New card is missing weight_class at fight '+(i+1)+'.');
  for(const name of [r[1],r[2]]){const key=norm(name);if(seen.has(key))throw new Error('New card contains a duplicate fighter: '+name);seen.add(key);}
 });
}

const event=$('When Called').first().json;
const state=$('Read Fight Card State').all().map(i=>i.json).find(s=>s.event_key===event.event_key&&s.spreadsheet_id===event.spreadsheet_id)||{};
const result=(status,extra={})=>[{json:{event,status,writes:[],expected:[],state_update:null,videos:[],telegram_message:'',dry_run:event.dry_run===true,needs_apply:false,...extra}}];
let changes=[];try{changes=JSON.parse(state.pending_change_json||'[]');}catch(e){changes=[];}
if(!changes.length)return result('NOTHING_TO_APPLY');
const seen=Number(state.pending_seen_count||0);
let official=[];try{official=JSON.parse(state.official_card_json||'[]');}catch(e){official=[];}
if(!official.length)return result('NEEDS_REVIEW',{reason:'Recorded change has no official card to apply.'});

const isRemoval=c=>c.type==='removed'||c.type==='opponent_replaced';
const removals=changes.filter(isRemoval);
const describe=c=>c.type==='added'?'Added: '+c.fight:c.type==='removed'?'Removed: '+c.fight:c.type==='opponent_replaced'?'Opponent change: '+c.from+' → '+c.to:c.type==='reordered'?'Moved: '+c.fight+' (fight '+c.from+' → '+c.to+')':c.type==='segment_changed'?'Segment: '+c.fight+' ('+c.from+' → '+c.to+')':c.type==='details_changed'?c.fight+': '+c.field+' '+c.from+' → '+c.to:c.type==='renamed'?'Renamed: '+c.from+' → '+c.to:c.type;
if(removals.length>MAX_REMOVALS){
 const msg='<b>Fight card needs review</b>\n<b>Event:</b> '+event.event_name+'\n'+removals.length+' bouts would be removed at once, so nothing was changed:\n'+removals.map(c=>'• '+describe(c)).join('\n');
 return result('NEEDS_REVIEW',{reason:removals.length+' removals at once.',telegram_message:seen===1?msg:''});
}
const ready=c=>!isRemoval(c)||(seen>=2&&c.espn_listed!==true);
const apply=changes.filter(ready),waiting=changes.filter(c=>!ready(c));
const waitWhy=c=>c.espn_listed===true?'ESPN still lists it':'waiting for a second check';
if(!apply.length)return result('WAITING',{waiting:waiting.map(c=>describe(c)+' ('+waitWhy(c)+')')});

// Current card as it is in the sheet (A:I).
const fcRows=$('Read Fight Card').first().json.rows||[];
const current=fcRows.slice(1).filter(r=>r.slice(0,8).some(v=>text(v))).map(r=>({fight_order:Number(r[0]),fighter_a:text(r[1]),fighter_b:text(r[2]),fighter_a_aliases:text(r[3]),fighter_b_aliases:text(r[4]),bout_type:text(r[5]),scheduled_rounds:Number(r[6]),weight_class:text(r[7]),bout_id:text(r[8])}));
if(current.some(b=>!b.bout_id))throw new Error('Fight Card rows need bout_id before card changes can be applied.');
let saved=[];try{saved=JSON.parse(state.source_card_json||'[]');}catch(e){saved=[];}
const savedById=new Map(saved.filter(b=>b.bout_id).map(b=>[b.bout_id,b]));
const currentById=new Map(current.map(b=>[b.bout_id,b]));

// Build the new card: the official card, with waiting removals kept in place and waiting replacements not yet swapped.
const waitingRemoved=waiting.filter(c=>c.type==='removed').map(c=>c.bout_id);
const waitingSwap=new Map(waiting.filter(c=>c.type==='opponent_replaced').map(c=>[c.bout_id,c.old_bout_id]));
const fromOfficial=o=>{const cur=currentById.get(o.bout_id)||{};return {...(savedById.get(o.bout_id)||{}),...o,fighter_a_aliases:cur.fighter_a_aliases||'',fighter_b_aliases:cur.fighter_b_aliases||''};};
const fromCurrent=b=>({...(savedById.get(b.bout_id)||{}),...b});
const next=official.map(o=>waitingSwap.has(o.bout_id)?fromCurrent(currentById.get(waitingSwap.get(o.bout_id))):fromOfficial(o));
for(const id of waitingRemoved){
 const b=currentById.get(id);
 const before=current.filter(x=>x.fight_order<b.fight_order).reverse().map(x=>x.bout_id).find(x=>next.some(y=>y.bout_id===x));
 next.splice(before?next.findIndex(y=>y.bout_id===before)+1:Math.min(1,next.length),0,fromCurrent(b));
}
next.forEach((b,i)=>{b.fight_order=i+1;});
const matrix=next.map(b=>HEADERS.map(h=>b[h]??''));
checkCard(matrix);
const newOrder=new Map(next.map(b=>[b.bout_id,b.fight_order]));

// Describe what actually changes between the sheet and the new card; if nothing does, everything left is waiting.
const swaps=apply.filter(c=>c.type==='opponent_replaced');
const swapIds=new Set(swaps.flatMap(c=>[c.bout_id,c.old_bout_id]));
const nextById=new Map(next.map(b=>[b.bout_id,b]));
const diff=[];
for(const c of swaps)diff.push('Opponent change: '+c.from+' → '+c.to);
for(const b of next)if(!currentById.has(b.bout_id)&&!swapIds.has(b.bout_id))diff.push('Added: '+label(b)+' ('+b.bout_type.replace('_',' ')+')');
for(const b of current)if(!nextById.has(b.bout_id)&&!swapIds.has(b.bout_id))diff.push('Removed: '+label(b));
const moved=next.filter(b=>currentById.has(b.bout_id)&&currentById.get(b.bout_id).fight_order!==b.fight_order);
if(moved.length>3)diff.push('Re-numbered '+moved.length+' bouts');
else for(const b of moved)diff.push('Moved: '+label(b)+' (fight '+currentById.get(b.bout_id).fight_order+' → '+b.fight_order+')');
for(const b of next){const c=currentById.get(b.bout_id);if(!c)continue;
 if(norm(c.fighter_a)+norm(c.fighter_b)!==norm(b.fighter_a)+norm(b.fighter_b))diff.push('Renamed: '+label(c)+' → '+label(b));
 for(const [f,name] of [['bout_type','segment'],['scheduled_rounds','rounds'],['weight_class','weight class']])if(text(c[f])!==text(b[f]))diff.push(label(b)+': '+name+' '+text(c[f])+' → '+text(b[f]));}
if(!diff.length)return result('WAITING',{waiting:waiting.map(c=>describe(c)+' ('+waitWhy(c)+')')});

// Rows: void picks for bouts that left the card, renumber the rest. Only fight_order and review_status are written.
const voidIds=new Set([...apply.filter(c=>c.type==='removed').map(c=>c.bout_id),...apply.filter(c=>c.type==='opponent_replaced').map(c=>c.old_bout_id)]);
const writes=[],expected=[],rowSummary={};
for(const tab of TABS){
 const rows=$(tab.node).first().json.rows||[];
 const h=(rows[0]||[]).map(text);
 const col=n=>h.indexOf(n);
 const idx={order:col('fight_order'),status:col('review_status'),bout:col('bout_id'),event:col('event_key')};
 if(Object.values(idx).some(i=>i<0))throw new Error(tab.sheet+' is missing fight_order, review_status, bout_id or event_key.');
 const orders=['fight_order'],statuses=['review_status'];
 let renumbered=0,voided=0;
 rows.slice(1).forEach((r,k)=>{
  const order=r[idx.order]??'',status=text(r[idx.status]),bout=text(r[idx.bout]);
  if(!r.some(v=>text(v))||text(r[idx.event])!==event.event_key||status.startsWith('VOID')){orders.push(order);statuses.push(status);return;}
  if(voidIds.has(bout)){orders.push(order);statuses.push(VOID);voided++;return;}
  if(!newOrder.has(bout))throw new Error(tab.sheet+' row '+(k+2)+' has bout '+bout+', which is not on the new card.');
  const o=newOrder.get(bout);if(Number(order)!==o)renumbered++;
  orders.push(o);statuses.push(status);
 });
 const cell=(i,vals)=>({range:"'"+tab.sheet+"'!"+colName(i)+'1:'+colName(i)+vals.length,rows:vals.map(v=>[v])});
 if(renumbered)writes.push({label:tab.sheet+' fight_order',...cell(idx.order,orders)});
 if(voided)writes.push({label:tab.sheet+' review_status',...cell(idx.status,statuses)});
 expected.push({sheet:tab.sheet,node:'Recheck '+tab.sheet,column:idx.order,values:orders},{sheet:tab.sheet,node:'Recheck '+tab.sheet,column:idx.status,values:statuses});
 rowSummary[tab.sheet]={renumbered,voided};
}
// Fight Card last, so an interrupted run is found again by the next detection and resumed.
const cardRows=[[...HEADERS,'bout_id'],...next.map(b=>[...HEADERS.map(h=>b[h]??''),b.bout_id])];
const height=Math.max(cardRows.length,fcRows.length);
while(cardRows.length<height)cardRows.push(Array(9).fill(''));
writes.push({label:'Fight Card',range:"'Fight Card'!A1:I"+height,rows:cardRows});
for(let c=0;c<9;c++)expected.push({sheet:'Fight Card',node:'Recheck Fight Card',column:c,values:cardRows.slice(0,next.length+1).map(r=>r[c]),rows_exact:next.length+1});

// Videos to re-analyse: transcripts that mention both fighters of a new bout, or videos with picks on a renamed bout.
const transcripts=new Map();
const tr=$('Read Transcripts').first().json.rows||[];
const th=(tr[0]||[]).map(text),tv=th.indexOf('video_id'),tt=th.indexOf('transcript_text');
for(const r of tr.slice(1)){const v=text(r[tv]);if(v)transcripts.set(v,(transcripts.get(v)||'')+words(r[tt]));}
const videos=$('Read Event Videos').all().map(i=>i.json).filter(v=>v.video_id&&v.event_key===event.event_key&&text(v.analysis_status).toUpperCase()==='COMPLETED');
const reasons=new Map();
const mark=(v,why)=>{if(!reasons.has(v))reasons.set(v,new Set());reasons.get(v).add(why);};
const newBouts=apply.filter(c=>c.type==='added'||c.type==='opponent_replaced').map(c=>next.find(b=>b.bout_id===c.bout_id)).filter(Boolean);
for(const v of videos){
 const t=transcripts.get(text(v.video_id))||'';
 for(const b of newBouts)if(t.includes(' '+surname(b.fighter_a)+' ')&&t.includes(' '+surname(b.fighter_b)+' '))mark(v.video_id,'mentions '+label(b));
}
const renamed=new Set(apply.filter(c=>c.type==='renamed').map(c=>c.bout_id));
if(renamed.size){
 const rows=$('Read Picks').first().json.rows||[];const h=(rows[0]||[]).map(text);
 for(const r of rows.slice(1))if(renamed.has(text(r[h.indexOf('bout_id')]))&&videos.some(v=>v.video_id===text(r[h.indexOf('video_id')])))mark(text(r[h.indexOf('video_id')]),'picks on a renamed bout');
}
const reanalyse=[...reasons.entries()].map(([video_id,why])=>({video_id,reason:[...why].join('; ')}));

const checkedAt=new Date().toISOString();
const appliedJson=JSON.stringify(apply);
const stateUpdate={
 status:'READY',
 card_fingerprint:fingerprint(matrix),
 source_card_json:JSON.stringify(next),
 change_status:waiting.length?'PARTLY_APPLIED':'APPLIED',
 pending_change_json:waiting.length?JSON.stringify(waiting):'',
 pending_change_fingerprint:'',pending_seen_count:0,pending_first_seen_at:null,
 official_card_json:waiting.length?state.official_card_json:'',
 change_checked_at:checkedAt,
};
const lines=['<b>Fight card updated</b>','<b>Event:</b> '+event.event_name,'',...diff.map(d=>'• '+d)];
const voidedTotal=Object.values(rowSummary).reduce((n,r)=>n+r.voided,0);
if(voidedTotal)lines.push('','Voided '+voidedTotal+' picks/props/analyses for bouts that left the card.');
lines.push(reanalyse.length?'Re-analysing '+reanalyse.length+' video'+(reanalyse.length===1?'':'s')+'.':'No videos need re-analysis.');
if(waiting.length)lines.push('','<b>Still waiting:</b>',...waiting.map(c=>'• '+describe(c)+' ('+waitWhy(c)+')'));
return [{json:{event,status:waiting.length?'PARTLY_APPLY':'APPLY',applied:apply,applied_json:appliedJson,waiting,new_card:next,writes,expected,row_summary:rowSummary,videos:reanalyse,state_update:stateUpdate,telegram_message:lines.join('\n'),dry_run:event.dry_run===true,needs_apply:event.dry_run!==true}}];
