
const request=$('When Called').first().json;
const events=$input.all().map(i=>i.json).filter(e=>e.event_key===request.event_key);
if(events.length!==1)throw new Error('Fight-card setup requires one stored UFC event for '+request.event_key+'.');
const event={...request,...events[0]};
if(!/^[A-Za-z0-9_-]+$/.test(String(event.spreadsheet_id||'')))throw new Error('UFC event has no valid spreadsheet. Run spreadsheet setup first.');
const path=String(event.source_event_id||'').replace(/^https:\/\/www\.ufc\.com\//,'').replace(/^\//,'');
if(!Number.isFinite(Date.parse(event.event_datetime_local)))throw new Error('UFC event date is missing or invalid.');
return [{json:{...event,dry_run:request.dry_run===true,source_url:/^event\/[a-z0-9-]+$/.test(path)?'https://www.ufc.com/'+path:''}}];
