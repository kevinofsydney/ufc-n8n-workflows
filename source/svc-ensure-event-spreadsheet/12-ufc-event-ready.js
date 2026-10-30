const rows=$input.all().map(item=>item.json).filter(event=>event.event_key && event.spreadsheet_id);
if(rows.length !== 1) throw new Error('UFC spreadsheet setup did not return one saved event.');
const {__drive_query,__copy_id,...event}=rows[0];
return [{json:event}];
