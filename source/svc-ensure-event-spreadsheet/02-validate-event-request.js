const items=$input.all();
if(items.length !== 1 || !String(items[0].json.event_key || '').trim()) throw new Error('UFC spreadsheet setup needs exactly one event_key.');
return [{json:{...items[0].json,event_key:String(items[0].json.event_key).trim()}}];
