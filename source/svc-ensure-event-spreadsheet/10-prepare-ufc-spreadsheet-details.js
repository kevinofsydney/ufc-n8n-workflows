const event=$('Validate Stored Event').first().json;
const spreadsheetId=String($input.first().json.id || $input.first().json.__copy_id || '');
if(!/^[A-Za-z0-9_-]+$/.test(spreadsheetId)) throw new Error('Google Drive did not return a valid UFC spreadsheet ID.');
const {__drive_query,...output}=event;
return [{json:{...output,spreadsheet_id:spreadsheetId,spreadsheet_url:'https://docs.google.com/spreadsheets/d/'+spreadsheetId+'/edit'}}];
