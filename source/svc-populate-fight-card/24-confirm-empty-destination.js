
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

const rows=$input.first().json.rows||[];
if(checkCard(rows,true).length)throw new Error('Fight Card was populated while sources were being checked. No rows were overwritten. Retry to use the existing card.');
return [{json:$('Build Fight Card Matrix').first().json}];
