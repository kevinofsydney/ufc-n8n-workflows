// Gives every Fight Card bout and every Picks/Props/Fight Analysis row a stable bout_id, and
// rewrites legacy fight_order-based row IDs (video|pick|3) to bout-based IDs (video|pick|ufc:13133).
// Only column I of Fight Card and the id + bout_id columns of each tab are written. Re-running is a no-op.
const BASE=['fight_order','fighter_a','fighter_b','fighter_a_aliases','fighter_b_aliases','bout_type','scheduled_rounds','weight_class'];
const TABS=[
 {sheet:'Picks',node:'Read Picks',idCol:'pick_id',kind:'pick'},
 {sheet:'Props',node:'Read Props',idCol:'prop_id',kind:'prop'},
 {sheet:'Fight Analysis',node:'Read Fight Analysis',idCol:'fight_analysis_id',kind:'fight'},
];
const text=v=>String(v??'').trim();
const norm=v=>text(v).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const pair=(a,b)=>[norm(a),norm(b)].sort().join('|');
const surname=v=>{const words=text(v).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().split(/\s+/).map(w=>w.replace(/[^a-z0-9]/g,'')).filter(w=>w&&!['jr','sr','ii','iii','iv'].includes(w));return words[words.length-1]||'';};
const surnamePair=(a,b)=>[surname(a),surname(b)].sort().join('|');
const samePair=(a1,b1,a2,b2)=>pair(a1,b1)===pair(a2,b2)||surnamePair(a1,b1)===surnamePair(a2,b2);
const colName=index=>{let n=index+1,s='';while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26);}return s;};

const event=$('When Called').first().json;
if(!event.event_key||!/^[A-Za-z0-9_-]+$/.test(String(event.spreadsheet_id||'')))throw new Error('Bout ID sync needs an event with a saved spreadsheet.');
const states=$('Read Fight Card State').all().map(i=>i.json).filter(s=>s.event_key===event.event_key&&s.spreadsheet_id===event.spreadsheet_id);
if(states.length>1)throw new Error('Duplicate fight-card state records need review before syncing bout IDs.');
const state=states[0];
if(!state||!['READY','PRESERVED'].includes(state.status))throw new Error('Bout ID sync needs a READY or PRESERVED fight card.');
const saved=JSON.parse(state.source_card_json||'[]');

// Fight Card: each row must match the saved card at the same fight order.
const fcRows=$('Read Fight Card').first().json.rows||[];
if(BASE.some((h,i)=>text(fcRows[0]?.[i])!==h))throw new Error('Fight Card headers changed. Bout ID sync stopped.');
const fcHeaderI=text(fcRows[0]?.[8]);
if(fcHeaderI&&fcHeaderI!=='bout_id')throw new Error('Fight Card column I is already used for '+fcHeaderI+'.');
const fcData=fcRows.slice(1);
const fcCount=fcData.filter(r=>r.slice(0,8).some(v=>text(v))).length;
if(!fcCount)throw new Error('Fight Card is empty. Bout ID sync stopped.');
if(fcData.slice(0,fcCount).some(r=>!r.slice(0,8).some(v=>text(v))))throw new Error('Fight Card has blank rows between fights. Review before syncing bout IDs.');
const bouts=fcData.slice(0,fcCount).map((r,i)=>{
 const order=Number(r[0]);
 if(order!==i+1)throw new Error('Fight Card has invalid order at row '+(i+2)+'.');
 const s=saved.find(b=>Number(b.fight_order)===order);
 if(!s||pair(s.fighter_a,s.fighter_b)!==pair(r[1],r[2]))throw new Error('Fight Card fight '+order+' does not match the saved card. Review before syncing bout IDs.');
 // Cards entered by hand have no UFC id; derive a stable one from the fighters.
 const boutId=text(s.bout_id)||('card:'+[norm(r[1]),norm(r[2])].sort().join('-'));
 const current=text(r[8]);
 // A name-based id is upgraded once the saved card learns the bout's UFC id; any other change is refused.
 const upgrade=current.startsWith('card:')&&boutId.startsWith('ufc:');
 if(current&&current!==boutId&&!upgrade)throw new Error('Fight Card fight '+order+' has bout_id '+current+' but the saved card says '+boutId+'.');
 return {order,fighter_a:text(r[1]),fighter_b:text(r[2]),bout_id:boutId,current,old_id:upgrade?current:null};
});
if(new Set(bouts.map(b=>b.bout_id)).size!==bouts.length)throw new Error('Fight Card bout IDs are not unique.');
const byOrder=new Map(bouts.map(b=>[b.order,b]));
const byId=new Map([...bouts.map(b=>[b.bout_id,b]),...bouts.filter(b=>b.old_id).map(b=>[b.old_id,b])]);

const writes=[];
const expected=[];
const summary={ufc_ids_adopted:bouts.filter(b=>b.old_id).length,fight_card_bout_ids_written:0,headers_added:[],rows_rekeyed:{},rows_bout_id_set:{}};
if(fcHeaderI!=='bout_id'||bouts.some(b=>b.current!==b.bout_id)){
 const rows=[['bout_id'],...bouts.map(b=>[b.bout_id])];
 writes.push({label:'Fight Card bout_id',range:"'Fight Card'!I1:I"+rows.length,rows});
 summary.fight_card_bout_ids_written=bouts.filter(b=>b.current!==b.bout_id).length;
}
expected.push({sheet:'Fight Card',node:'Recheck Fight Card',column:8,values:['bout_id',...bouts.map(b=>b.bout_id)]});

const idWrites=[];
for(const tab of TABS){
 const rows=$(tab.node).first().json.rows||[];
 const header=(rows[0]||[]).map(text);
 if(!header.length)throw new Error(tab.sheet+' has no header row.');
 const col=name=>header.indexOf(name);
 const idx={id:col(tab.idCol),order:col('fight_order'),a:col('fighter_a'),b:col('fighter_b'),event:col('event_key'),video:col('video_id')};
 const statusIdx=col('review_status');
 const missing=Object.entries(idx).filter(([,i])=>i<0).map(([k])=>k);
 if(missing.length)throw new Error(tab.sheet+' is missing columns needed for bout IDs: '+missing.join(', ')+'.');
 const addHeader=col('bout_id')<0;
 const boutIdx=addHeader?header.length:col('bout_id');
 const ids=[tab.idCol],boutIds=['bout_id'];
 let rekeyed=0,boutSet=0;
 rows.slice(1).forEach((r,k)=>{
  const rowNo=k+2;
  const id=text(r[idx.id]),bout=text(r[boutIdx]);
  // Rows voided by a card change keep their ids; their bout has left the card.
  if(!r.some(v=>text(v))||text(r[idx.event])!==event.event_key||(statusIdx>=0&&text(r[statusIdx]).startsWith('VOID'))){ids.push(id);boutIds.push(bout);return;}
  const order=Number(r[idx.order]);
  const b=bout?byId.get(bout):byOrder.get(order);
  if(!b)throw new Error(tab.sheet+' row '+rowNo+' does not match any bout on the Fight Card.');
  if(b.order!==order)throw new Error(tab.sheet+' row '+rowNo+' has fight_order '+order+' but bout '+b.bout_id+' is fight '+b.order+'.');
  if(!samePair(r[idx.a],r[idx.b],b.fighter_a,b.fighter_b))throw new Error(tab.sheet+' row '+rowNo+' fighters do not match Fight Card fight '+b.order+'.');
  const video=text(r[idx.video]);
  const m=tab.kind==='prop'?id.match(/^([^|]+)\|prop\|([^|]+)\|(.+)$/):id.match(new RegExp('^([^|]+)\\|'+tab.kind+'\\|([^|]+)$'));
  if(!m||m[1]!==video)throw new Error(tab.sheet+' row '+rowNo+' has an unrecognised '+tab.idCol+': '+id);
  if(/^\d+$/.test(m[2])&&Number(m[2])!==order)throw new Error(tab.sheet+' row '+rowNo+' ID fight number does not match its fight_order.');
  if(!/^\d+$/.test(m[2])&&m[2]!==b.bout_id&&m[2]!==b.old_id)throw new Error(tab.sheet+' row '+rowNo+' ID points at a different bout than its bout_id.');
  const newId=tab.kind==='prop'?m[1]+'|prop|'+b.bout_id+'|'+m[3]:m[1]+'|'+tab.kind+'|'+b.bout_id;
  if(newId!==id)rekeyed++;
  if(bout!==b.bout_id)boutSet++;
  ids.push(newId);boutIds.push(b.bout_id);
 });
 const seen=new Set();
 ids.slice(1).filter(Boolean).forEach(v=>{if(seen.has(v))throw new Error(tab.sheet+' would contain duplicate '+tab.idCol+' '+v+'.');seen.add(v);});
 const boutCol=colName(boutIdx),idCol=colName(idx.id);
 if(addHeader||boutSet)writes.push({label:tab.sheet+' bout_id',range:"'"+tab.sheet+"'!"+boutCol+'1:'+boutCol+boutIds.length,rows:boutIds.map(v=>[v]),new_column:addHeader});
 // ID columns are written after every bout_id column, so a partial run can always be resumed.
 if(rekeyed)idWrites.push({label:tab.sheet+' '+tab.idCol,range:"'"+tab.sheet+"'!"+idCol+'1:'+idCol+ids.length,rows:ids.map(v=>[v])});
 expected.push({sheet:tab.sheet,node:'Recheck '+tab.sheet,column:boutIdx,values:boutIds});
 expected.push({sheet:tab.sheet,node:'Recheck '+tab.sheet,column:idx.id,values:ids});
 if(addHeader)summary.headers_added.push(tab.sheet);
 summary.rows_rekeyed[tab.sheet]=rekeyed;
 summary.rows_bout_id_set[tab.sheet]=boutSet;
}
writes.push(...idWrites);
const dryRun=event.dry_run===true;
return [{json:{event,bout_ids:Object.fromEntries(bouts.map(b=>[b.order,b.bout_id])),writes,expected,summary,dry_run:dryRun,needs_write:writes.length>0&&!dryRun}}];
