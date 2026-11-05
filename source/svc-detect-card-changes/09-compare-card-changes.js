// Builds the official card exactly as svc.populate_fight_card does (UFC page + ESPN), then compares it
// with the sheet's card and describes every difference. It never writes.
function buildOfficial(){

const HEADERS=['fight_order','fighter_a','fighter_b','fighter_a_aliases','fighter_b_aliases','bout_type','scheduled_rounds','weight_class'];
const text=v=>String(v??'').trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const cleanName=v=>text(v).replace(/\s*\[https?:\/\/[^\]]+\]/g,'').replace(/\s+/g,' ').trim();
const populated=rows=>(rows||[]).slice(1).filter(row=>row.some(v=>text(v)));
function checkCard(rows,allowEmpty=false){
 if(!Array.isArray(rows)||HEADERS.some((h,i)=>text(rows[0]?.[i])!==h))throw new Error('Fight Card needs the eight expected headers in columns A:H.');
 const data=populated(rows);
 if(!data.length){if(allowEmpty)return [];throw new Error('Fight Card is empty. Run UFC event spreadsheet setup before analysis.');}
 const seen=new Set();
 data.forEach((r,i)=>{
  if(Number(r[0])!==i+1||!text(r[1])||!text(r[2])||norm(r[1])===norm(r[2]))throw new Error('Fight Card has invalid order or fighters at fight '+(i+1)+'.');
  if(!['main_event','main_card','prelim'].includes(text(r[5]))||![3,5].includes(Number(r[6])))throw new Error('Fight Card has missing bout type or scheduled rounds at fight '+(i+1)+'.');
  if((i===0)!==(r[5]==='main_event'))throw new Error('Fight Card must have exactly one main event at fight 1.');
  if(!text(r[7]))throw new Error('Fight Card is missing weight_class at fight '+(i+1)+'.');
  for(const name of [r[1],r[2]]){const key=norm(name);if(seen.has(key))throw new Error('Fight Card contains a duplicate fighter: '+name);seen.add(key);}
 });
 return data;
}
function fingerprint(rows){const value=JSON.stringify(rows.map(r=>r.map(v=>text(v))));let hash=2166136261;for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619)>>>0;return 'fnv1a-'+hash.toString(16).padStart(8,'0');}

const event=$('Prepare UFC Card Request').first().json;
const official=$('Extract Official UFC Card').first().json;
const http=$('Fetch Official UFC Card').first().json;
if(http.statusCode!==200)throw new Error('Official UFC card request returned HTTP '+http.statusCode+'. No spreadsheet data was written.');
if(String(official.canonical||'').replace(/\/$/,'')!==event.source_url)throw new Error('Official UFC page does not match the stored event URL.');
// UFC lists upcoming cards as one flat list until it splits them into main card and prelims.
// Build those from the flat list (UFC is the source of truth for bouts, names and order) and take
// rounds, weight class and segment from ESPN. Report pending only if ESPN cannot place the segments.
const unsplit=['main','prelim','early'].every(s=>Array.isArray(official[s+'_ids'])&&!official[s+'_ids'].length);
const mainTimestamp=Number(unsplit?official.hero_timestamp:official.main_timestamp);
if(!mainTimestamp||Math.abs(mainTimestamp*1000-Date.parse(event.event_datetime_local))>18*3600000)throw new Error('Official UFC card date does not match the selected event.');
const card=[];
// UFC sometimes ships .c-listing-fight with an empty data-fmid (rebuilt or altered cards), which
// collapses every bout_id to 'ufc:'. Fall back to athlete URL slugs, which are always present.
const athleteSlug=u=>text(u).replace(/^.*\/athlete\//,'').replace(/[^A-Za-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase();
const boutId=(id,u1,u2)=>text(id)?'ufc:'+text(id):'ufc:'+athleteSlug(u1)+'--'+athleteSlug(u2);
for(const section of unsplit?['unsplit']:['main','prelim','early']){
 const arrays=['ids','a','b','a_url','b_url'].map(k=>official[section+'_'+k]);
 if(arrays.some(a=>!Array.isArray(a))||arrays.some(a=>a.length!==arrays[0].length))throw new Error('Official UFC card fields are incomplete in '+section+'.');
 arrays[0].forEach((id,i)=>card.push({bout_id:boutId(id,arrays[3][i],arrays[4][i]),fighter_a:cleanName(arrays[1][i]),fighter_b:cleanName(arrays[2][i]),fighter_a_url:arrays[3][i],fighter_b_url:arrays[4][i],bout_type:section==='main'?(i===0?'main_event':'main_card'):section==='unsplit'?null:'prelim'}));
}
if(!card.length)throw new Error('Official UFC page lists no fights. The page layout may have changed. No spreadsheet data was written.');
if(card.length<2||card.length>30||new Set(card.map(b=>b.bout_id)).size!==card.length)throw new Error('Official UFC card is missing, duplicated or outside the expected size.');
const pair=(a,b)=>[norm(a),norm(b)].sort().join('|');
const surname=v=>{const words=text(v).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().split(/\s+/).map(w=>w.replace(/[^a-z0-9]/g,'')).filter(w=>w&&!['jr','sr','ii','iii','iv'].includes(w));return words[words.length-1]||'';};
const surnamePair=(a,b)=>[surname(a),surname(b)].sort().join('|');
const names=c=>[c.competitors[0].athlete?.displayName,c.competitors[1].athlete?.displayName];
// Exact full-name pairing first; fall back to surnames (e.g. Zach vs Zachary) only when that is unique.
function findCompsBasic(comps,a,b){
 const named=(comps||[]).filter(c=>c.competitors?.length===2);
 const exact=named.filter(c=>pair(...names(c))===pair(a,b));
 if(exact.length)return {comps:exact,tier:'exact'};
 const bySurname=named.filter(c=>surnamePair(...names(c))===surnamePair(a,b));
 if(bySurname.length)return {comps:bySurname,tier:'surname'};
 // One side renamed (UFC 'Jose Souza' vs ESPN 'Jose Henrique'): accept a competition where exactly one
 // fighter hits by full name or surname, provided that hit is unique. The ESPN spelling is kept as an alias.
 const one=named.filter(c=>{const [x,y]=names(c);const hit=v=>norm(v)===norm(a)||norm(v)===norm(b)||surname(v)===surname(a)||surname(v)===surname(b);return hit(x)!==hit(y);});
 return {comps:one,tier:'alias'};
}
const findComps=(comps,a,b)=>findCompsBasic(comps,a,b).comps;
const response=$input.first().json;
if(response.statusCode!==200)throw new Error('ESPN round verification returned HTTP '+response.statusCode+'. No spreadsheet data was written.');
const options=(response.body?.events||[]).filter(e=>Math.abs(Date.parse(e.date)-Date.parse(event.event_datetime_local))<=24*3600000&&findComps(e.competitions,card[0].fighter_a,card[0].fighter_b).length===1);
if(options.length!==1)throw new Error('Could not uniquely verify this UFC event and its main event on ESPN.');
const espn=options[0];
const competitions=(espn.competitions||[]).filter(c=>!/cancel|postpon/i.test(String(c.status?.type?.name||'')));
// ESPN can lag UFC either way. A UFC bout ESPN does not list at all (never the main event) is held out rather than
// stopping the whole card: it has no verified rounds or weight class yet. More than MAX_HELD such bouts still stops it.
const MAX_HELD=3;
const held=[];
const used=new Set();
card.forEach((b,i)=>{b.ufc_index=i;});
for(const bout of card){
 const found=findCompsBasic(competitions,bout.fighter_a,bout.fighter_b);
 const matches=found.comps;
 if(!matches.length&&bout!==card[0]){held.push(bout);continue;}
 if(matches.length!==1||used.has(matches[0].id))throw new Error('Could not verify pairing and rounds for '+bout.fighter_a+' vs '+bout.fighter_b+'.');
 const comp=matches[0];used.add(comp.id);
 if(found.tier==='alias'){
  // Keep the ESPN spelling so later stages can reconcile the two names.
  const [ea,eb]=names(comp);
  const fits=(ufc,espn)=>norm(ufc)===norm(espn)||surname(ufc)===surname(espn);
  if(!fits(bout.fighter_a,ea))bout.fighter_a_aliases=ea;
  if(!fits(bout.fighter_b,eb))bout.fighter_b_aliases=eb;
 }
 const rounds=Number(comp.format?.regulation?.periods);
 if(![3,5].includes(rounds))throw new Error('Scheduled rounds are unavailable for '+bout.fighter_a+' vs '+bout.fighter_b+'.');
 const weightClass=String(comp.type?.abbreviation||'').trim().toLowerCase();
 if(!/^[a-z][a-z '’-]{3,39}$/.test(weightClass))throw new Error('Weight class is unavailable for '+bout.fighter_a+' vs '+bout.fighter_b+'.');
 Object.assign(bout,{scheduled_rounds:rounds,weight_class:weightClass,espn_competition_id:String(comp.id),espn_start:Date.parse(comp.date),fighter_a_aliases:bout.fighter_a_aliases||'',fighter_b_aliases:bout.fighter_b_aliases||''});
 for(const key of ['fighter_a_url','fighter_b_url'])if(!/^https:\/\/www\.ufc\.com\/athlete\/[a-z0-9-]+$/.test(bout[key]))throw new Error('Invalid official athlete URL.');
}
if(held.length>MAX_HELD)throw new Error('ESPN does not list '+held.length+' UFC bouts ('+held.map(b=>b.fighter_a+' vs '+b.fighter_b).join('; ')+'). Review the card before populating it.');
for(const b of held)card.splice(card.indexOf(b),1);
const heldBouts=held.map(b=>({bout_id:b.bout_id,fighter_a:b.fighter_a,fighter_b:b.fighter_b,fighter_a_url:b.fighter_a_url,fighter_b_url:b.fighter_b_url,ufc_index:b.ufc_index}));
// ESPN bouts UFC does not list are left off the card (UFC is the source of truth) and reported.
const espnOnly=competitions.filter(c=>!used.has(c.id)&&c.competitors?.length===2).map(c=>names(c).join(' vs '));
if(unsplit){
 const starts=[...new Set(card.map(b=>b.espn_start))].filter(Number.isFinite).sort((a,b)=>b-a);
 if(starts.length<2)return [{json:{...event,card_pending:true,fight_card_status:'PENDING_OFFICIAL_CARD',fight_card_count:0,pending_reason:'UFC.com has not split the card and ESPN start times do not separate main card from prelims. No spreadsheet data was written.',checked_at:new Date().toISOString()}}];
 const mainStart=starts[0];
 if(Math.abs(mainStart-mainTimestamp*1000)>3600000)throw new Error('ESPN main card start does not match the official UFC event time.');
 if(card[0].espn_start!==mainStart)throw new Error('ESPN does not place the UFC main event on the main card.');
 card.forEach((b,i)=>{b.bout_type=i===0?'main_event':b.espn_start===mainStart?'main_card':'prelim';});
 // Keep UFC's order within each segment, main card before prelims.
 const rank={main_event:0,main_card:1,prelim:2};
 card.sort((x,y)=>rank[x.bout_type]-rank[y.bout_type]);
}
card.forEach((b,i)=>{b.fight_order=i+1;delete b.espn_start;});
const rows=card.map(b=>HEADERS.map(h=>b[h]));
checkCard([HEADERS,...rows]);
return [{json:{...event,card,espn_event_id:String(espn.id),card_source:unsplit?'ufc-unsplit+espn-segments':'ufc-sections',espn_only_bouts:espnOnly,held_bouts:heldBouts,source_fingerprint:fingerprint(rows),parser_version:'ufc-fight-card-v2',checked_at:new Date().toISOString()}}];

}

// ---- Compare the official card with the card in the sheet. Nothing here writes; it only describes changes.
const t=v=>String(v??'').trim();
const n=v=>t(v).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const pairOf=(a,b)=>[n(a),n(b)].sort().join('|');
const last=v=>{const w=t(v).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().split(/\s+/).map(x=>x.replace(/[^a-z0-9]/g,'')).filter(x=>x&&!['jr','sr','ii','iii','iv'].includes(x));return w[w.length-1]||'';};
const lastPair=(a,b)=>[last(a),last(b)].sort().join('|');
const hash=v=>{const s=JSON.stringify(v);let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;return 'fnv1a-'+h.toString(16).padStart(8,'0');};
const label=b=>b.fighter_a+' vs '+b.fighter_b;

const request=$('Prepare UFC Card Request').first().json;
const state=$('Read Fight Card State').all().map(i=>i.json).find(s=>s.event_key===request.event_key&&s.spreadsheet_id===request.spreadsheet_id)||{};
const checkedAt=new Date().toISOString();
// When the card cannot be checked, keep whatever change was pending so its two-check count survives.
const done=(status,extra)=>[{json:{...request,card_check:{status,checked_at:checkedAt,changes:[],change_count:0,fingerprint:t(state.pending_change_fingerprint),seen_count:Number(state.pending_seen_count||0),first_seen_at:state.pending_first_seen_at||null,pending_change_json:t(state.pending_change_json),official_card_json:t(state.official_card_json),adoptions:0,adopted_source_card_json:null,...extra}}}];

// Consecutive UNAVAILABLE checks are recorded so svc.health_sweep can alert; any verified check clears them.
const unavailable=reason=>done('UNAVAILABLE',{reason,unavailable_since:state.card_unavailable_since||checkedAt,unavailable_count:Number(state.card_unavailable_count||0)+1,unavailable_reason:t(reason).slice(0,300)});

const rows=$('Read Fight Card').first().json.rows||[];
const current=rows.slice(1).filter(r=>r.slice(0,8).some(v=>t(v))).map(r=>({fight_order:Number(r[0]),fighter_a:t(r[1]),fighter_b:t(r[2]),bout_type:t(r[5]),scheduled_rounds:Number(r[6]),weight_class:t(r[7]),bout_id:t(r[8])}));
if(!current.length)return unavailable('Fight Card is empty.');

let built;
try{built=buildOfficial()[0].json;}catch(e){return unavailable('Official card could not be verified: '+e.message);}
if(built.card_pending)return unavailable(built.pending_reason);
const official=built.card;
// A held UFC bout (ESPN does not list it) that is already in the sheet stays on the card where UFC places it,
// with the sheet's details, so it is neither removed nor moved. One new to the sheet waits until ESPN lists it.
const sameBout=(x,y)=>(x.bout_id&&x.bout_id===y.bout_id)||pairOf(x.fighter_a,x.fighter_b)===pairOf(y.fighter_a,y.fighter_b)||lastPair(x.fighter_a,x.fighter_b)===lastPair(y.fighter_a,y.fighter_b);
const heldKept=[],heldWaiting=[];
for(const h of built.held_bouts||[]){
 const c=current.find(x=>sameBout(x,h));
 if(!c){heldWaiting.push(label(h));continue;}
 const before=official.filter(o=>o.ufc_index<h.ufc_index).sort((x,y)=>x.ufc_index-y.ufc_index).pop();
 const at=before?official.indexOf(before)+1:Math.min(1,official.length);
 official.splice(at,0,{bout_id:h.bout_id,fighter_a:h.fighter_a,fighter_b:h.fighter_b,fighter_a_url:h.fighter_a_url,fighter_b_url:h.fighter_b_url,fighter_a_aliases:'',fighter_b_aliases:'',bout_type:c.bout_type==='main_event'?'main_card':c.bout_type,scheduled_rounds:c.scheduled_rounds,weight_class:c.weight_class,espn_competition_id:'',ufc_index:h.ufc_index});
 heldKept.push(label(h));
}
if(heldKept.length)official.forEach((o,i)=>{o.fight_order=i+1;});
// Whether ESPN still lists a bout (not cancelled): removals are only applied once ESPN drops it too.
const espnEvent=(($input.first().json.body||{}).events||[]).find(e=>String(e.id)===String(built.espn_event_id))||{};
const espnLive=(espnEvent.competitions||[]).filter(x=>x.competitors?.length===2&&!/cancel|postpon/i.test(String(x.status?.type?.name||'')));
const espnLists=(a,b)=>espnLive.some(x=>{const p=x.competitors.map(y=>y.athlete?.displayName);return pairOf(p[0],p[1])===pairOf(a,b)||lastPair(p[0],p[1])===lastPair(a,b);});

// Match each sheet bout to an official bout: by UFC bout_id, else by fighters (exact, then unique surnames).
const used=new Set();
const matched=[],unmatched=[];
for(const c of current){
 let o=c.bout_id.startsWith('ufc:')?official.find(x=>x.bout_id===c.bout_id&&!used.has(x.bout_id)):null;
 if(o&&pairOf(o.fighter_a,o.fighter_b)!==pairOf(c.fighter_a,c.fighter_b)&&lastPair(o.fighter_a,o.fighter_b)!==lastPair(c.fighter_a,c.fighter_b))o=null;
 if(!o){
  const free=official.filter(x=>!used.has(x.bout_id));
  const exact=free.filter(x=>pairOf(x.fighter_a,x.fighter_b)===pairOf(c.fighter_a,c.fighter_b));
  const loose=exact.length?exact:free.filter(x=>lastPair(x.fighter_a,x.fighter_b)===lastPair(c.fighter_a,c.fighter_b));
  if(loose.length===1)o=loose[0];
 }
 if(o){used.add(o.bout_id);matched.push({c,o});}else unmatched.push(c);
}

const changes=[];
const adoptions=[];
for(const {c,o} of matched){
 const bout={bout_id:o.bout_id,fight:label(o)};
 if(c.bout_id!==o.bout_id)adoptions.push({type:'adopt_ufc_id',...bout,from:c.bout_id||null,to:o.bout_id,fight_order:c.fight_order});
 if(pairOf(c.fighter_a,c.fighter_b)!==pairOf(o.fighter_a,o.fighter_b))changes.push({type:'renamed',...bout,from:label(c),to:label(o)});
 if(c.fight_order!==o.fight_order)changes.push({type:'reordered',...bout,from:c.fight_order,to:o.fight_order});
 if(c.bout_type!==o.bout_type)changes.push({type:'segment_changed',...bout,from:c.bout_type,to:o.bout_type});
 for(const f of ['scheduled_rounds','weight_class'])if(String(c[f])!==String(o[f]))changes.push({type:'details_changed',...bout,field:f,from:c[f],to:o[f]});
}
// A removed bout that shares a fighter with a new official bout is an opponent change.
const fresh=official.filter(x=>!used.has(x.bout_id));
for(const c of unmatched){
 const people=[n(c.fighter_a),n(c.fighter_b)],surnames=[last(c.fighter_a),last(c.fighter_b)];
 const swap=fresh.filter(x=>!used.has(x.bout_id)&&([x.fighter_a,x.fighter_b].some(f=>people.includes(n(f)))||[x.fighter_a,x.fighter_b].some(f=>surnames.includes(last(f)))));
 if(swap.length===1){used.add(swap[0].bout_id);changes.push({type:'opponent_replaced',bout_id:swap[0].bout_id,old_bout_id:c.bout_id,from:label(c),to:label(swap[0]),fight_order:swap[0].fight_order,espn_listed:espnLists(c.fighter_a,c.fighter_b)});}
 else changes.push({type:'removed',bout_id:c.bout_id,fight:label(c),fight_order:c.fight_order,espn_listed:espnLists(c.fighter_a,c.fighter_b)});
}
for(const o of official.filter(x=>!used.has(x.bout_id)))changes.push({type:'added',bout_id:o.bout_id,fight:label(o),fight_order:o.fight_order,bout_type:o.bout_type});

// Consecutive identical detections are counted so removals can wait for two checks in a row.
const fingerprint=changes.length?hash(changes):'';
const seen=!changes.length?0:(t(state.pending_change_fingerprint)===fingerprint?Number(state.pending_seen_count||0)+1:1);
const firstSeen=!changes.length?null:(t(state.pending_change_fingerprint)===fingerprint&&state.pending_first_seen_at?state.pending_first_seen_at:checkedAt);

// Adopt UFC ids (plus athlete URLs and ESPN ids) into the saved card for bouts that are otherwise the same.
let adoptedCard=null;
if(adoptions.length){
 let saved=[];try{saved=JSON.parse(state.source_card_json||'[]');}catch(e){saved=[];}
 adoptedCard=current.map(c=>{
  const s=saved.find(b=>Number(b.fight_order)===c.fight_order&&pairOf(b.fighter_a,b.fighter_b)===pairOf(c.fighter_a,c.fighter_b))||{};
  const m=matched.find(x=>x.c===c);
  const ids=m&&adoptions.some(a=>a.to===m.o.bout_id)?{bout_id:m.o.bout_id,fighter_a_url:m.o.fighter_a_url,fighter_b_url:m.o.fighter_b_url,espn_competition_id:m.o.espn_competition_id}:{};
  const {bout_id:_ignored,...rest}=c;
  return {...s,...rest,...(c.bout_id?{bout_id:c.bout_id}:{}),...ids};
 });
}
const status=changes.length?'CHANGED':adoptions.length?'ADOPT_IDS':'IN_SYNC';
return [{json:{...request,card_check:{status,checked_at:checkedAt,changes,change_count:changes.length,fingerprint,seen_count:seen,first_seen_at:firstSeen,pending_change_json:changes.length?JSON.stringify(changes):'',official_card_json:changes.length?JSON.stringify(official):'',adoptions:adoptions.length,adopted_source_card_json:adoptedCard?JSON.stringify(adoptedCard):null,espn_only_bouts:built.espn_only_bouts||[],held_bouts_kept:heldKept,held_bouts_waiting:heldWaiting,official_source:built.card_source,unavailable_since:null,unavailable_count:0,unavailable_reason:''}}}];
