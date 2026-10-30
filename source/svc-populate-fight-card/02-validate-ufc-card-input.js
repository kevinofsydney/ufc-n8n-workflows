const items=$input.all();if(items.length!==1||!String(items[0].json.event_key||'').trim())throw new Error('Fight-card setup needs exactly one UFC event_key.');return items;
