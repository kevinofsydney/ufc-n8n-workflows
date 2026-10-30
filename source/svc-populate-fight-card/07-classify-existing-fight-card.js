
const HEADERS=['fight_order','fighter_a','fighter_b','fighter_a_aliases','fighter_b_aliases','bout_type','scheduled_rounds'];
const text=v=>String(v??'').trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const cleanName=v=>text(v).replace(/\s*\[https?:\/\/[^\]]+\]/g,'').replace(/\s+/g,' ').trim();
const populated=rows=>(rows||[]).slice(1).filter(row=>row.some(v=>text(v)));
function checkCard(rows,allowEmpty=false){
 if(!Array.isArray(rows)||HEADERS.some((h,i)=>text(rows[0]?.[i])!==h))throw new Error('Fight Card needs the seven expected headers in columns A:G.');
 const data=populated(rows);
 if(!data.length){if(allowEmpty)return [];throw new Error('Fight Card is empty. Run UFC event spreadsheet setup before analysis.');}
 const seen=new Set();
 data.forEach((r,i)=>{
  if(Number(r[0])!==i+1||!text(r[1])||!text(r[2])||norm(r[1])===norm(r[2]))throw new Error('Fight Card has invalid order or fighters at fight '+(i+1)+'.');
  if(!['main_event','main_card','prelim'].includes(text(r[5]))||![3,5].includes(Number(r[6])))throw new Error('Fight Card has missing bout type or scheduled rounds at fight '+(i+1)+'.');
  if((i===0)!==(r[5]==='main_event'))throw new Error('Fight Card must have exactly one main event at fight 1.');
  for(const name of [r[1],r[2]]){const key=norm(name);if(seen.has(key))throw new Error('Fight Card contains a duplicate fighter: '+name);seen.add(key);}
 });
 return data;
}
function fingerprint(rows){const value=JSON.stringify(rows.map(r=>r.map(v=>text(v))));let hash=2166136261;for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619)>>>0;return 'fnv1a-'+hash.toString(16).padStart(8,'0');}

const event=$('Prepare UFC Card Request').first().json;
const states=$('Read Fight Card State').all().map(i=>i.json).filter(s=>s.event_key===event.event_key&&s.spreadsheet_id===event.spreadsheet_id);
if(states.length>1)throw new Error('Duplicate fight-card state records need review before continuing.');
const state=states[0]||{};
const rows=$input.first().json.rows||[];
const card=checkCard(rows,true);
const weightHeader=text(rows[0]?.[7]);
if(weightHeader&&weightHeader!=='weight_class')throw new Error('Fight Card column H is already in use. Review it before adding weight_class.');
if(!weightHeader&&card.some(r=>text(r[7])))throw new Error('Fight Card has values in column H without a weight_class header.');
const needsWeightClassBackfill=card.length>0&&(!weightHeader||card.some(r=>!text(r[7])));
const storedRows=state.parser_version==='ufc-fight-card-v2'?card:card.map(r=>r.slice(0,7));
if(card.length&&['WRITING','READY'].includes(state.status)&&fingerprint(storedRows)!==state.card_fingerprint)throw new Error('Fight Card differs from its saved automatic candidate. Review the spreadsheet and initialization state before retrying.');
if(card.length&&state.status==='READY'&&card.length!==JSON.parse(state.source_card_json||'[]').length)throw new Error('Fight Card row count changed after initialization. Review before analysis.');

// Keep what the saved card knows beyond the sheet (bout_id, athlete URLs, ESPN ids) for bouts that are unchanged.
const pairKey=(a,b)=>[norm(a),norm(b)].sort().join('|');
let savedCard=[];try{savedCard=JSON.parse(state.source_card_json||'[]');}catch(e){savedCard=[];}
const existingCard=card.map(r=>{const row={...Object.fromEntries(HEADERS.map((h,i)=>[h,r[i]??''])),weight_class:text(r[7])};const s=savedCard.find(b=>Number(b.fight_order)===Number(r[0])&&pairKey(b.fighter_a,b.fighter_b)===pairKey(r[1],r[2]));return s?{...s,...row}:row;});
const verifiedExisting=state.status==='WRITING'||state.status==='READY';
const cardVersion=card.length&&!needsWeightClassBackfill?'ufc-fight-card-v2':(state.parser_version||'ufc-fight-card-v1');
const cardFingerprint=card.length?fingerprint(cardVersion==='ufc-fight-card-v2'?card:card.map(r=>r.slice(0,7))):null;
return [{json:{...event,existing_card_json:JSON.stringify(cardVersion==='ufc-fight-card-v2'?existingCard:(verifiedExisting?JSON.parse(state.source_card_json||'[]'):existingCard)),existing_card_state:card.length?(verifiedExisting?'READY':'PRESERVED'):'EMPTY',existing_initialized_at:state.initialized_at||(card.length?new Date().toISOString():null),needs_population:card.length===0,needs_weight_class_backfill:needsWeightClassBackfill,fight_card_parser_version:cardVersion,fight_card_status:card.length?(verifiedExisting?'READY':'PRESERVED'):'EMPTY',fight_card_count:card.length,fight_card_fingerprint:cardFingerprint}}];
