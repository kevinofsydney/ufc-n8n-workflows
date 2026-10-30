const request=$('Prepare Single Capture').first().json;
const rows=$input.all().map(i=>i.json).filter(r=>r.video_id===request.video_id&&r.event_key===request.event_key);
if(rows.length!==1)throw new Error('Capture did not leave exactly one video row.');
const row=rows[0],captured=row.transcript_appended===true||row.transcript_appended==='true';
const completed=row.analysis_status==='COMPLETED';
return [{json:{...request,target_video_row:row,should_analyse:captured&&!completed,transcript_appended:captured,analysis_status:row.analysis_status,outcome:completed?'already_completed':captured?'captured':'capture_pending',text:completed?'This video is already analysed.':captured?'Transcript captured. Analysing this video now.':'Video added, but an English transcript is not available yet. Analysis was skipped. Use /retry '+request.video_id+' later. '+String(row.last_error||'').slice(0,300)}}];
