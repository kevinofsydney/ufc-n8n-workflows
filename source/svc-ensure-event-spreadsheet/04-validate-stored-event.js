const request = $('Validate Event Request').first().json;
const events = $input.all().map(item=>item.json).filter(event=>event.event_key === request.event_key);
if(events.length !== 1 || !events[0].event_name) throw new Error('UFC spreadsheet setup expected one stored event for ' + request.event_key + '; found ' + events.length + '.');
const event = {...request,...events[0]};
if (event.spreadsheet_id && !/^[A-Za-z0-9_-]+$/.test(String(event.spreadsheet_id))) throw new Error('Stored UFC spreadsheet_id is invalid for ' + event.event_key + '.');
const escapedName = (event.event_name + ' — Transcripts').replace(/\\/g,'\\\\').replace(/'/g, "\\'");
return [{json:{...event,__drive_query: "name = '" + escapedName + "' and 'YOUR_FOLDERID' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"}}];
