
const event=$('Classify Existing Fight Card').first().json;
const rows=$('Read Fight Card').first().json.rows||[];
const baseHeaders=['fight_order','fighter_a','fighter_b','fighter_a_aliases','fighter_b_aliases','bout_type','scheduled_rounds'];
const text=value=>String(value??'').trim();
const norm=value=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const pair=(a,b)=>[norm(a),norm(b)].sort().join('|');
const fingerprint=matrix=>{const value=JSON.stringify(matrix.map(row=>row.map(cell=>text(cell))));let hash=2166136261;for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619)>>>0;return 'fnv1a-'+hash.toString(16).padStart(8,'0');};
if(!event.needs_weight_class_backfill)throw new Error('Weight class backfill was requested for a card that is already complete.');
if(baseHeaders.some((name,index)=>text(rows[0]?.[index])!==name))throw new Error('Fight Card base headers changed before weight class backfill.');
const card=rows.slice(1).filter(row=>row.some(cell=>text(cell)));
if(card.length!==event.fight_card_count)throw new Error('Fight Card changed before weight class backfill.');
if(fingerprint(card.map(row=>row.slice(0,7)))!==fingerprint(JSON.parse(event.existing_card_json).map(bout=>baseHeaders.map(name=>bout[name]??''))))throw new Error('Fight Card rows changed before weight class backfill.');
const response=$input.first().json;
if(response.statusCode!==200)throw new Error('ESPN weight class lookup returned HTTP '+response.statusCode+'.');
const events=response.body?.events||[];
const firstPair=pair(card[0]?.[1],card[0]?.[2]);
const options=events.filter(candidate=>Math.abs(Date.parse(candidate.date)-Date.parse(event.event_datetime_local))<=24*3600000&&(candidate.competitions||[]).some(comp=>comp.competitors?.length===2&&pair(comp.competitors[0].athlete?.displayName,comp.competitors[1].athlete?.displayName)===firstPair));
if(options.length!==1)throw new Error('Could not uniquely verify the UFC event for weight class backfill.');
const competitions=(options[0].competitions||[]).filter(comp=>!/cancel|postpon/i.test(String(comp.status?.type?.name||'')));
if(competitions.length!==card.length)throw new Error('UFC card and ESPN list different bout counts; weight class backfill stopped.');
const enriched=[];
const storedCard=JSON.parse(event.existing_card_json);
const fullRows=[];
for(const row of card){
 const matches=competitions.filter(comp=>comp.competitors?.length===2&&pair(comp.competitors[0].athlete?.displayName,comp.competitors[1].athlete?.displayName)===pair(row[1],row[2]));
 if(matches.length!==1)throw new Error('Could not uniquely match weight class for '+row[1]+' vs '+row[2]+'.');
 const weightClass=text(matches[0].type?.abbreviation).toLowerCase();
 if(!/^[a-z][a-z '’-]{3,39}$/.test(weightClass))throw new Error('Weight class is unavailable for '+row[1]+' vs '+row[2]+'.');
 const existing=text(row[7]);
 if(existing&&existing.toLowerCase()!==weightClass)throw new Error('Existing weight_class conflicts with ESPN for '+row[1]+' vs '+row[2]+'.');
 fullRows.push([...row.slice(0,7),weightClass]);
 enriched.push({...storedCard[enriched.length],weight_class:weightClass});
}
const weightRows=[['weight_class'],...enriched.map(bout=>[bout.weight_class])];
return [{json:{...event,rows:weightRows,weight_class_preview:weightRows,fight_card_status:event.dry_run?'PREVIEW':'READY',fight_card_fingerprint:fingerprint(fullRows),fight_card_parser_version:'ufc-fight-card-v2',existing_card_json:JSON.stringify(enriched)}}];
