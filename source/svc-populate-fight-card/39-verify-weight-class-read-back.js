
const candidate=$('Build Weight Class Backfill').first().json;
const rows=$input.first().json.rows||[];
const text=value=>String(value??'').trim();
const fingerprint=matrix=>{const value=JSON.stringify(matrix.map(row=>row.map(cell=>text(cell))));let hash=2166136261;for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619)>>>0;return 'fnv1a-'+hash.toString(16).padStart(8,'0');};
if(text(rows[0]?.[7])!=='weight_class')throw new Error('weight_class header was not saved in Fight Card column H.');
const card=rows.slice(1).filter(row=>row.some(cell=>text(cell)));
if(card.length!==candidate.fight_card_count)throw new Error('Fight Card row count changed during weight class backfill.');
if(fingerprint(card.map(row=>row.slice(0,8)))!==candidate.fight_card_fingerprint)throw new Error('Fight Card read-back differs from the verified weight class backfill.');
return [{json:candidate}];
