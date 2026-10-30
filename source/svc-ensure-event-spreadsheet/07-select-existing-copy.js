const matches=$input.all().map(item=>item.json).filter(file=>file.id);
if(matches.length>1) throw new Error('More than one UFC spreadsheet matches this event. Choose the correct spreadsheet_id in ufc_events before retrying.');
return [{json:{...$('Validate Stored Event').first().json,__copy_id:matches[0]?.id || ''}}];
