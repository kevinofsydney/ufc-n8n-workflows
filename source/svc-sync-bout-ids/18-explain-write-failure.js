// Turns a failed column write into a message that says which tab needs room.
let write={};
try{write=$('Each Column Write').item.json;}catch{write=$input.first().json;}
const raw=$input.first().json.error;
const detail=typeof raw==='string'?raw:(raw?.description||raw?.message||JSON.stringify(raw||{}));
const tab=(String(write.range||'').match(/^'(.+)'!/)||[])[1]||'the target';
const hint=/grid limits/i.test(detail)||write.new_column?' The '+tab+' tab has no empty column for bout_id: add a bout_id header in its next empty column (or insert one empty column at the end), then re-run.':'';
throw new Error('Could not write '+(write.label||'a bout ID column')+' ('+(write.range||'unknown range')+'): '+detail+'.'+hint);
