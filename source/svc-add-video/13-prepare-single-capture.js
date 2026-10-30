const request=$('Validate Add Video').first().json;
const rows=$input.all().map(i=>i.json).filter(r=>r.video_id===request.video_id&&r.event_key===request.event_key&&r.status==='MANUAL_CAPTURE_REQUESTED');
if(rows.length!==1)return [{json:{...request,should_capture:false,outcome:'already_claimed',text:'This video is already queued or being processed. Use /status to check progress.'}}];
const row=rows[0];
return [{json:{...request,should_capture:true,manual_retry:true,target_video_id:row.video_id,target_video_row:row}}];
