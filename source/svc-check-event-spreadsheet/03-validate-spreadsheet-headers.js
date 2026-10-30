
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
const event = $('Prepare Schema Check').first().json;
const ranges = event.__sheet_contracts.map(contract => ({values: $('Read ' + contract.sheet + ' Headers').first().json.header_rows || []}));
const problems = [];
const warnings = [];
event.__sheet_contracts.forEach((contract, index) => {
 const raw = ranges[index]?.values?.[0] || [];
 const headers = raw.map(value => String(value ?? ''));
 const names = headers.filter(Boolean);
 const missing = contract.required.filter(name => !names.includes(name));
 const extra = contract.exact ? names.filter(name => ![...contract.required, ...(contract.optional || [])].includes(name)) : [];
 const duplicates = [...new Set(names.filter((name, i) => names.indexOf(name) !== i))];
 if (missing.length) problems.push(contract.sheet + ': missing columns [' + missing.join(', ') + ']');
 if (extra.length) problems.push(contract.sheet + ': unexpected columns [' + extra.join(', ') + '] — refresh the n8n mapping and schema contract if intentional');
 const blockingDuplicates = duplicates.filter(name => !(contract.allowedDuplicateHeaders || []).includes(name));
 const knownDuplicates = duplicates.filter(name => (contract.allowedDuplicateHeaders || []).includes(name));
 if (blockingDuplicates.length) problems.push(contract.sheet + ': duplicate headers [' + blockingDuplicates.join(', ') + ']');
 if (knownDuplicates.length) warnings.push(contract.sheet + ': legacy duplicate metadata headers [' + knownDuplicates.join(', ') + ']');
 if (headers.some((name, i) => !name && headers.slice(i + 1).some(Boolean))) problems.push(contract.sheet + ': blank header between populated columns');
});

try {
 const card=checkCard($('Read Fight Card Headers').first().json.header_rows||[]);
 const states=$('Read UFC Fight Card State').all().map(i=>i.json).filter(s=>s.event_key===event.event_key&&s.spreadsheet_id===event.spreadsheet_id);
 if(states.length>1)problems.push('Fight Card: duplicate initialization records require review');
 if(states.some(s=>s.status==='WRITING'))problems.push('Fight Card: automatic initialization has not passed read-back verification; review the saved candidate and rerun setup');
 const ready=states.find(s=>s.status==='READY');
 if(ready&&fingerprint(ready.parser_version==='ufc-fight-card-v2'?card:card.map(r=>r.slice(0,7)))!==ready.card_fingerprint)problems.push('Fight Card: data differs from the verified automatic card; review changes before analysis');
} catch(error) { problems.push(error.message); }
if (problems.length) throw new Error('UFC spreadsheet preflight failed for ' + (event.event_name || event.event_key) + '. ' + problems.join('; ') + '. Restore the expected headers before analysis. ' + (event.spreadsheet_url || ''));
const {__sheet_contracts, ...output} = event;
return [{json: {...output, spreadsheet_schema_version: 'ufc-sheet-schema-v2', spreadsheet_schema_warnings: warnings, spreadsheet_schema_checked_at: new Date().toISOString()}}];
