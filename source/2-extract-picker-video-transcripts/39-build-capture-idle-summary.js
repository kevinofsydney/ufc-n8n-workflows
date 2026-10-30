const source=$('Select Videos To Process').first().json;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const scan=source.scan_stats||{expected:0,checked:0,loaded:0,failed_count:0,failed:[]};
const lines=[scan.failed_count?'<b>UFC capture finished with YouTube API errors</b>':'<b>UFC capture complete</b>','', '<b>Event:</b> '+esc(source.event_name),''];
if(scan.failed_count===scan.expected&&scan.expected>0){
 lines.push('No transcripts captured. All '+scan.expected+' YouTube YouTube channels failed to load, so new videos could not be checked.');
}else if(scan.failed_count){
 lines.push('No new eligible videos found in the '+scan.loaded+' YouTube channels that loaded. '+scan.failed_count+' of '+scan.expected+' channels failed, so this check is incomplete.');
}else{
 lines.push('No new eligible videos to capture. Checked '+scan.checked+' YouTube channels.');
 if(source.already_recorded)lines.push(source.already_recorded+' eligible videos were already recorded.');
}
if(source.waiting_retries)lines.push(source.waiting_retries+' transcript retries are waiting for the five-hour retry interval.');
if(source.exhausted_retries)lines.push(source.exhausted_retries+' videos have reached the transcript attempt limit.');
if(scan.failed_count){
 lines.push('','<b>YouTube API errors:</b>');
 for(const failure of scan.failed.slice(0,4))lines.push('• '+esc(failure.channel)+': '+esc(failure.error));
 if(scan.failed.length>4)lines.push('… and '+(scan.failed.length-4)+' more YouTube channels.');
 lines.push('','Try /capture later. You can also use /addvideo URL to submit one public video directly.');
}
if(source.spreadsheet_url)lines.push('','<a href="'+esc(source.spreadsheet_url)+'">Open transcript spreadsheet</a>');
return [{json:{telegram_message:lines.join('\n'),event_name:source.event_name,spreadsheet_url:source.spreadsheet_url,captured_count:0,retry_count:0,gave_up_count:0,total_processed:0,capture_run_state:source.capture_run_state,capture_run_summary:source.capture_run_summary}}];
