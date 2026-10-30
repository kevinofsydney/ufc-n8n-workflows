// Decide whether this card can be checked, and shape the request the official-card builder expects.
const event=$('When Called').first().json;
const states=$('Read Fight Card State').all().map(i=>i.json).filter(s=>s.event_key===event.event_key&&s.spreadsheet_id===event.spreadsheet_id);
const state=states.length===1?states[0]:null;
const start=Date.parse(event.event_datetime_local);
let skip='';
if(!state)skip=states.length?'Duplicate fight-card state records.':'No saved fight-card state.';
else if(!['READY','PRESERVED'].includes(state.status))skip='Fight card is '+state.status+', not READY.';
else if(!/^https:\/\/www\.ufc\.com\/event\/[a-z0-9-]+$/.test(String(state.source_url||'')))skip='Saved card has no official UFC event URL.';
else if(!Number.isFinite(start))skip='Event date is missing.';
else if(start<=Date.now())skip='Event has started; the card is locked.';
return [{json:{...event,source_url:state?.source_url||'',dry_run:event.dry_run===true,can_check:!skip,skip_reason:skip}}];
