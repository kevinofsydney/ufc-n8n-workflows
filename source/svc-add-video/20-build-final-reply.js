const request=$('Prepare Single Analysis').first().json;
const rows=$input.all().map(i=>i.json).filter(r=>r.video_id===request.video_id&&r.event_key===request.event_key);
const row=rows.length===1?rows[0]:null;
const complete=row?.analysis_status==='COMPLETED';
return [{json:{...request,should_analyse:false,analysis_status:row?.analysis_status||'',outcome:complete?'completed':'analysis_pending',text:complete?'Added and analysed: '+request.channel_name+' — '+request.video_title+'. Your picks and analysis are in the event spreadsheet.':'Transcript captured, but analysis did not complete. Use /status or /retry analyse '+request.video_id+'. '+String(row?.analysis_error||'').slice(0,300)}}];
