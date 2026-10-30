
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
for(const section of unsplit?['unsplit']:['main','prelim','early']){
 const arrays=['ids','a','b','a_url','b_url'].map(k=>official[section+'_'+k]);
 if(arrays.some(a=>!Array.isArray(a))||arrays.some(a=>a.length!==arrays[0].length))throw new Error('Official UFC card fields are incomplete in '+section+'.');
 arrays[0].forEach((id,i)=>card.push({bout_id:'ufc:'+id,fighter_a:cleanName(arrays[1][i]),fighter_b:cleanName(arrays[2][i]),fighter_a_url:arrays[3][i],fighter_b_url:arrays[4][i],bout_type:section==='main'?(i===0?'main_event':'main_card'):section==='unsplit'?null:'prelim'}));
}
if(!card.length)throw new Error('Official UFC page lists no fights. The page layout may have changed. No spreadsheet data was written.');
if(card.length<2||card.length>30||new Set(card.map(b=>b.bout_id)).size!==card.length)throw new Error('Official UFC card is missing, duplicated or outside the expected size.');
const pair=(a,b)=>[norm(a),norm(b)].sort().join('|');
const surname=v=>{const words=text(v).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().split(/\s+/).map(w=>w.replace(/[^a-z0-9]/g,'')).filter(w=>w&&!['jr','sr','ii','iii','iv'].includes(w));return words[words.length-1]||'';};
const surnamePair=(a,b)=>[surname(a),surname(b)].sort().join('|');
const names=c=>[c.competitors[0].athlete?.displayName,c.competitors[1].athlete?.displayName];
// Exact full-name pairing first; fall back to surnames (e.g. Zach vs Zachary) only when that is unique.
function findComps(comps,a,b){
 const named=(comps||[]).filter(c=>c.competitors?.length===2);
 const exact=named.filter(c=>pair(...names(c))===pair(a,b));
 return exact.length?exact:named.filter(c=>surnamePair(...names(c))===surnamePair(a,b));
}
const response=$input.first().json;
if(response.statusCode!==200)throw new Error('ESPN round verification returned HTTP '+response.statusCode+'. No spreadsheet data was written.');
const options=(response.body?.events||[]).filter(e=>Math.abs(Date.parse(e.date)-Date.parse(event.event_datetime_local))<=24*3600000&&findComps(e.competitions,card[0].fighter_a,card[0].fighter_b).length===1);
if(options.length!==1)throw new Error('Could not uniquely verify this UFC event and its main event on ESPN.');
const espn=options[0];
const competitions=(espn.competitions||[]).filter(c=>!/cancel|postpon/i.test(String(c.status?.type?.name||'')));
if(!unsplit&&competitions.length!==card.length)throw new Error('UFC and ESPN list different bout counts ('+card.length+' vs '+competitions.length+'). Review the card before populating it.');
const used=new Set();
for(const bout of card){
 const matches=findComps(competitions,bout.fighter_a,bout.fighter_b);
 if(matches.length!==1||used.has(matches[0].id))throw new Error('Could not verify pairing and rounds for '+bout.fighter_a+' vs '+bout.fighter_b+'.');
 const comp=matches[0];used.add(comp.id);
 const rounds=Number(comp.format?.regulation?.periods);
 if(![3,5].includes(rounds))throw new Error('Scheduled rounds are unavailable for '+bout.fighter_a+' vs '+bout.fighter_b+'.');
 const weightClass=String(comp.type?.abbreviation||'').trim().toLowerCase();
 if(!/^[a-z][a-z '’-]{3,39}$/.test(weightClass))throw new Error('Weight class is unavailable for '+bout.fighter_a+' vs '+bout.fighter_b+'.');
 Object.assign(bout,{scheduled_rounds:rounds,weight_class:weightClass,espn_competition_id:String(comp.id),espn_start:Date.parse(comp.date),fighter_a_aliases:'',fighter_b_aliases:''});
 for(const key of ['fighter_a_url','fighter_b_url'])if(!/^https:\/\/www\.ufc\.com\/athlete\/[a-z0-9-]+$/.test(bout[key]))throw new Error('Invalid official athlete URL.');
}
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
return [{json:{...event,card,espn_event_id:String(espn.id),card_source:unsplit?'ufc-unsplit+espn-segments':'ufc-sections',espn_only_bouts:espnOnly,source_fingerprint:fingerprint(rows),parser_version:'ufc-fight-card-v2',checked_at:new Date().toISOString()}}];
